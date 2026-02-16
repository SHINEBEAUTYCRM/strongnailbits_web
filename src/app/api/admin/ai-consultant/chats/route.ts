import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/* GET — list chat sessions with filtering & pagination */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();

    /* Build query */
    let query = supabase
      .from("ai_chat_sessions")
      .select("*, ai_chat_managers(name, telegram_username)", { count: "exact" });

    if (status) query = query.eq("status", status);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59.999Z");

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [], total: count || 0 });
  } catch (err) {
    console.error("[API:Chats] GET error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
