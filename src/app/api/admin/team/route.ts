/**
 * GET  /api/admin/team — список команди (без salary)
 * POST /api/admin/team — створити нового (тільки CEO)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";
import { ROLES } from "@/lib/admin/team-config";
import type { RoleKey } from "@/lib/admin/team-config";

export const dynamic = "force-dynamic";

// ────── GET ──────

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const url = new URL(request.url);
    const department = url.searchParams.get("department");
    const search = url.searchParams.get("q");

    let query = supabase
      .from("team_members")
      .select("id, name, phone, role, avatar_url, is_active, telegram_username, department, position_title, color")
      .order("name");

    if (department) query = query.eq("department", department);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data: members, error } = await query;
    if (error) {
      console.error("[Team GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get task counts per member
    const memberIds = (members || []).map((m) => m.id);
    const today = new Date().toISOString().split("T")[0];

    let tasksMap = new Map<string, { total: number; overdue: number }>();

    if (memberIds.length > 0) {
      const { data: taskRows } = await supabase
        .from("tasks")
        .select("assignee_id, column_id, due_date")
        .in("assignee_id", memberIds)
        .neq("column_id", "done");

      for (const t of taskRows || []) {
        if (!t.assignee_id) continue;
        const entry = tasksMap.get(t.assignee_id) || { total: 0, overdue: 0 };
        entry.total++;
        if (t.due_date && t.due_date < today) entry.overdue++;
        tasksMap.set(t.assignee_id, entry);
      }
    }

    const enriched = (members || []).map((m) => ({
      ...m,
      tasks_count: tasksMap.get(m.id)?.total || 0,
      overdue_count: tasksMap.get(m.id)?.overdue || 0,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[Team GET]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// ────── POST (CEO only) ──────

export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!user || user.role !== "ceo") {
      return NextResponse.json({ error: "Тільки CEO може додавати співробітників" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const body = await request.json();

    const { name, phone, role, position_title } = body;
    if (!name || !phone || !role) {
      return NextResponse.json({ error: "Ім'я, телефон та роль обов'язкові" }, { status: 400 });
    }

    const roleConfig = ROLES[role as RoleKey];
    if (!roleConfig) {
      return NextResponse.json({ error: "Невідома роль" }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      name,
      phone,
      role,
      department: roleConfig.department,
      color: roleConfig.color,
      is_active: true,
    };
    if (position_title) insertData.position_title = position_title;

    const { data: member, error } = await supabase
      .from("team_members")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[Team POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    console.error("[Team POST]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
