import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/* GET — list all managers */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ai_chat_managers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[API:Managers] GET error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

/* POST — create new manager */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();

    if (!body.telegram_id || !body.name) {
      return NextResponse.json(
        { success: false, error: "telegram_id and name are required" },
        { status: 400 },
      );
    }

    const row: Record<string, unknown> = {
      telegram_id: body.telegram_id,
      name: body.name,
    };

    const optionalFields = [
      "telegram_username", "avatar_url", "role", "max_chats",
      "work_hours_start", "work_hours_end", "work_days", "specializations",
    ];

    for (const f of optionalFields) {
      if (body[f] !== undefined) row[f] = body[f];
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ai_chat_managers")
      .insert(row)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[API:Managers] POST error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
