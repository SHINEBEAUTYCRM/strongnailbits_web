/**
 * GET   /api/admin/team/[id] — повна картка (salary/notes тільки CEO)
 * PATCH /api/admin/team/[id] — оновити (перевірка прав)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";
import { SELF_EDITABLE_FIELDS } from "@/types/team";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ────── GET ──────

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: member, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !member) {
      return NextResponse.json({ error: "Не знайдено" }, { status: 404 });
    }

    // Hide salary + notes for non-CEO
    if (user.role !== "ceo") {
      member.salary = null;
      member.notes = null;
    }

    return NextResponse.json(member);
  } catch (err) {
    console.error("[Team GET id]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// ────── PATCH ──────

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const isCeo = user.role === "ceo";
    const isSelf = user.id === id;

    if (!isCeo && !isSelf) {
      return NextResponse.json({ error: "Заборонено" }, { status: 403 });
    }

    // Filter allowed fields
    const updates: Record<string, unknown> = {};

    if (isCeo) {
      // CEO can update everything
      const ceoFields = [
        "name", "phone", "role", "position_title", "department",
        "hire_date", "salary", "schedule", "work_hours",
        "notes", "is_active", "color", "email", "telegram_username",
        "avatar_url", "personal_bio", "birthday", "skills",
      ];
      for (const field of ceoFields) {
        if (field in body) updates[field] = body[field];
      }
    } else {
      // Self — only personal fields
      for (const field of SELF_EDITABLE_FIELDS) {
        if (field in body) updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Немає полів для оновлення" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: member, error } = await supabase
      .from("team_members")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Team PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Hide salary + notes for non-CEO
    if (!isCeo) {
      member.salary = null;
      member.notes = null;
    }

    return NextResponse.json(member);
  } catch (err) {
    console.error("[Team PATCH]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
