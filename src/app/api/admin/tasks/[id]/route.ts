/**
 * PATCH  /api/admin/tasks/[id] — оновити задачу
 * DELETE /api/admin/tasks/[id] — видалити задачу
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ────── PATCH ──────

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const supabase = createAdminClient();
    const body = await request.json();

    // Get current task for activity log
    const { data: currentTask } = await supabase
      .from("tasks")
      .select("column_id, assignee_id, title")
      .eq("id", id)
      .single();

    if (!currentTask) {
      return NextResponse.json({ error: "Задачу не знайдено" }, { status: 404 });
    }

    // Build update object — only include provided fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowedFields = [
      "title", "description", "column_id", "assignee_id",
      "priority", "due_date", "tags", "linked_order",
      "recurring", "position",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        assignee:team_members!tasks_assignee_id_fkey(id, name, avatar_url),
        creator:team_members!tasks_created_by_fkey(id, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("[Tasks PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for column change (moved)
    if (body.column_id && body.column_id !== currentTask.column_id && body.actor_id) {
      await supabase.from("task_activity").insert({
        task_id: id,
        action: "moved",
        actor_id: body.actor_id,
        details: { from: currentTask.column_id, to: body.column_id },
      });
    }

    // Log activity for assignee change
    if ("assignee_id" in body && body.assignee_id !== currentTask.assignee_id && body.actor_id) {
      await supabase.from("task_activity").insert({
        task_id: id,
        action: "assigned",
        actor_id: body.actor_id,
        details: { assignee_id: body.assignee_id },
      });
    }

    return NextResponse.json(task);
  } catch (err) {
    console.error("[Tasks PATCH]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// ────── DELETE ──────

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const supabase = createAdminClient();

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("[Tasks DELETE]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Tasks DELETE]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
