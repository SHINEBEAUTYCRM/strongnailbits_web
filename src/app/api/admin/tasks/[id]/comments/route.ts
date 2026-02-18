/**
 * GET  /api/admin/tasks/[id]/comments — список коментарів
 * POST /api/admin/tasks/[id]/comments — додати коментар
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ────── GET ──────

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: taskId } = await context.params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("task_comments")
      .select(`
        *,
        author:team_members!task_comments_author_id_fkey(id, name, avatar_url)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Comments GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[Comments GET]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// ────── POST ──────

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: taskId } = await context.params;
    const supabase = createAdminClient();
    const body = await request.json();

    if (!body.text || typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json({ error: "Текст обов'язковий" }, { status: 400 });
    }

    if (!body.author_id) {
      return NextResponse.json({ error: "author_id обов'язковий" }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from("task_comments")
      .insert({
        task_id: taskId,
        author_id: body.author_id,
        text: body.text.trim(),
      })
      .select(`
        *,
        author:team_members!task_comments_author_id_fkey(id, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("[Comments POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from("task_activity").insert({
      task_id: taskId,
      action: "comment",
      actor_id: body.author_id,
      details: { text: body.text.trim().slice(0, 100) },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error("[Comments POST]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
