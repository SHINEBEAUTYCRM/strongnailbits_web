/**
 * GET   /api/admin/tasks/[id]/checklist — список пунктів
 * POST  /api/admin/tasks/[id]/checklist — додати пункт
 * PATCH /api/admin/tasks/[id]/checklist — оновити пункт (toggle done / edit text)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ────── GET — list items ──────

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("task_checklist")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true });

    if (error) {
      console.error("[Checklist GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[Checklist GET]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// ────── POST — add item ──────

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const supabase = createAdminClient();
    const body = await request.json();

    if (!body.text || typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json({ error: "Текст обов'язковий" }, { status: 400 });
    }

    // Get max position
    const { data: maxPos } = await supabase
      .from("task_checklist")
      .select("position")
      .eq("task_id", taskId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (maxPos?.position ?? -1) + 1;

    const { data: item, error } = await supabase
      .from("task_checklist")
      .insert({
        task_id: taskId,
        text: body.text.trim(),
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      console.error("[Checklist POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    if (body.actor_id) {
      await supabase.from("task_activity").insert({
        task_id: taskId,
        action: "checklist",
        actor_id: body.actor_id,
        details: { action: "added", text: body.text.trim() },
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("[Checklist POST]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// ────── PATCH — update item ──────

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const supabase = createAdminClient();
    const body = await request.json();

    if (!body.item_id) {
      return NextResponse.json({ error: "item_id обов'язковий" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if ("done" in body) updates.done = body.done;
    if ("text" in body && typeof body.text === "string") updates.text = body.text.trim();

    const { data: item, error } = await supabase
      .from("task_checklist")
      .update(updates)
      .eq("id", body.item_id)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) {
      console.error("[Checklist PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error("[Checklist PATCH]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
