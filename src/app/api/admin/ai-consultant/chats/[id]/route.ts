import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/* GET — single session + all its messages */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const [sessionRes, messagesRes] = await Promise.all([
      supabase
        .from("ai_chat_sessions")
        .select("*, ai_chat_managers(name, telegram_username)")
        .eq("id", id)
        .single(),
      supabase
        .from("ai_chat_messages")
        .select("*")
        .eq("session_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (sessionRes.error) {
      return NextResponse.json({ success: false, error: sessionRes.error.message }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: sessionRes.data,
      messages: messagesRes.data || [],
    });
  } catch (err) {
    console.error("[API:Chats] GET [id] error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
