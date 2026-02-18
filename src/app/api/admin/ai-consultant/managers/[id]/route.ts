import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "name", "telegram_username", "avatar_url", "role",
  "is_active", "is_online", "max_chats",
  "work_hours_start", "work_hours_end", "work_days", "specializations",
];

/* PUT — update manager */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("ai_chat_managers")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API:Managers] PUT error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

/* DELETE — remove manager (only if no active chats) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: mgr } = await supabase
      .from("ai_chat_managers")
      .select("active_chats")
      .eq("id", id)
      .single();

    if (mgr && mgr.active_chats > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete manager with active chats" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("ai_chat_managers")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API:Managers] DELETE error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
