import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/** GET /api/admin/boards — list all boards (without snapshot) */
export async function GET() {
  try {
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("boards")
      .select(
        "id, name, thumbnail, created_by, updated_by, created_at, updated_at",
      )
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[Boards] List error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[Boards] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST /api/admin/boards — create new board */
export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name || "Нова дошка";

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("boards")
      .insert({
        name,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id, name, created_at, updated_at")
      .single();

    if (error) {
      console.error("[Boards] Create error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[Boards] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
