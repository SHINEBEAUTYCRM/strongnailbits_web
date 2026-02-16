import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "is_working",
  "ai_start",
  "ai_end",
  "managers_start",
  "managers_end",
  "offline_message",
];

/* GET — read all 7 schedule rows */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ai_work_schedule")
      .select("*")
      .order("day_of_week", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[API:Schedule] GET error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

/* PUT — update all 7 rows */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ success: false, error: "Expected array of schedule rows" }, { status: 400 });
    }

    const supabase = createAdminClient();

    for (const row of body) {
      if (!row.id) continue;

      const updates: Record<string, unknown> = {};
      for (const key of ALLOWED_FIELDS) {
        if (row[key] !== undefined) updates[key] = row[key];
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from("ai_work_schedule")
          .update(updates)
          .eq("id", row.id);

        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
    }

    /* Return updated data */
    const { data, error } = await supabase
      .from("ai_work_schedule")
      .select("*")
      .order("day_of_week", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[API:Schedule] PUT error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
