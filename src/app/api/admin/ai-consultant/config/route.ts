import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "system_prompt",
  "additional_instructions",
  "tone",
  "model_fast",
  "model_smart",
  "temperature",
  "max_tokens",
  "daily_budget_usd",
  "monthly_budget_usd",
  "budget_action",
  "anon_msg_per_minute",
  "anon_msg_per_hour",
  "anon_msg_per_day",
  "anon_max_length",
  "anon_max_sessions_per_day",
  "auth_msg_per_minute",
  "auth_msg_per_hour",
  "auth_msg_per_day",
  "auth_max_length",
  "auth_max_sessions_per_day",
  "max_concurrent_requests",
  "language",
  "auto_escalate_after",
  "save_history_for_auth",
  "show_satisfaction_rating",
  "is_enabled",
  "show_on_pages",
  "hide_on_pages",
];

/* GET — read single config row */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("ai_consultant_config")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[API:AIConsultant] GET error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}

/* PUT — update config */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields provided" },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("ai_consultant_config")
      .select("id")
      .limit(1)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Config row not found" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("ai_consultant_config")
      .update(updates)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[API:AIConsultant] PUT error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
