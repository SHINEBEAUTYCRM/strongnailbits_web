/**
 * GET  /api/admin/tasks — список задач (з агрегацією)
 * POST /api/admin/tasks — створити задачу
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ColumnId, Priority } from "@/types/tasks";

export const dynamic = "force-dynamic";

// ────── GET ──────

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const url = new URL(request.url);

    // Optional filters
    const assignee = url.searchParams.get("assignee");
    const priority = url.searchParams.get("priority") as Priority | null;
    const search = url.searchParams.get("q");

    let query = supabase
      .from("tasks")
      .select(`
        *,
        assignee:team_members!tasks_assignee_id_fkey(id, name, avatar_url),
        creator:team_members!tasks_created_by_fkey(id, name, avatar_url)
      `)
      .order("position", { ascending: true });

    if (assignee) query = query.eq("assignee_id", assignee);
    if (priority) query = query.eq("priority", priority);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data: tasks, error } = await query;
    if (error) {
      console.error("[Tasks GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate counts for checklist, comments, attachments
    const taskIds = (tasks || []).map((t) => t.id);

    if (taskIds.length === 0) {
      return NextResponse.json(tasks || []);
    }

    // Checklist counts
    const { data: clRaw } = await supabase
      .from("task_checklist")
      .select("task_id, done")
      .in("task_id", taskIds);

    const clMap = new Map<string, { total: number; done: number }>();
    for (const item of clRaw || []) {
      const entry = clMap.get(item.task_id) || { total: 0, done: 0 };
      entry.total++;
      if (item.done) entry.done++;
      clMap.set(item.task_id, entry);
    }

    // Comment counts
    const { data: cmRaw } = await supabase
      .from("task_comments")
      .select("task_id")
      .in("task_id", taskIds);

    const cmMap = new Map<string, number>();
    for (const item of cmRaw || []) {
      cmMap.set(item.task_id, (cmMap.get(item.task_id) || 0) + 1);
    }

    // Attachment counts
    const { data: atRaw } = await supabase
      .from("task_attachments")
      .select("task_id")
      .in("task_id", taskIds);

    const atMap = new Map<string, number>();
    for (const item of atRaw || []) {
      atMap.set(item.task_id, (atMap.get(item.task_id) || 0) + 1);
    }

    // Enrich tasks
    const enriched = (tasks || []).map((t) => ({
      ...t,
      checklist_total: clMap.get(t.id)?.total || 0,
      checklist_done: clMap.get(t.id)?.done || 0,
      comments_count: cmMap.get(t.id) || 0,
      attachments_count: atMap.get(t.id) || 0,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[Tasks GET]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// ────── POST ──────

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    const { title, description, column_id, assignee_id, priority, due_date, tags, linked_order, recurring, created_by } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Назва обов'язкова" }, { status: 400 });
    }

    // Get max position in the target column
    const col: ColumnId = column_id || "new";
    const { data: maxPos } = await supabase
      .from("tasks")
      .select("position")
      .eq("column_id", col)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (maxPos?.position ?? -1) + 1;

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        description: description || "",
        column_id: col,
        assignee_id: assignee_id || null,
        priority: priority || "medium",
        due_date: due_date || null,
        tags: tags || [],
        linked_order: linked_order || null,
        recurring: recurring || null,
        position: nextPosition,
        created_by: created_by || null,
      })
      .select(`
        *,
        assignee:team_members!tasks_assignee_id_fkey(id, name, avatar_url),
        creator:team_members!tasks_created_by_fkey(id, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error("[Tasks POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    if (created_by) {
      await supabase.from("task_activity").insert({
        task_id: task.id,
        action: "created",
        actor_id: created_by,
        details: { title: task.title, column: col },
      });
    }

    return NextResponse.json({ ...task, checklist_total: 0, checklist_done: 0, comments_count: 0, attachments_count: 0 }, { status: 201 });
  } catch (err) {
    console.error("[Tasks POST]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
