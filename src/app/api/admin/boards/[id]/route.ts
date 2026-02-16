import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/boards/[id] — get board with snapshot */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[Boards] Get error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH /api/admin/boards/[id] — update snapshot, name, or thumbnail */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const updates: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (body.snapshot !== undefined) updates.snapshot = body.snapshot;
    if (body.name !== undefined) updates.name = body.name;
    if (body.thumbnail !== undefined) updates.thumbnail = body.thumbnail;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("boards")
      .update(updates)
      .eq("id", id)
      .select("id, name, updated_at")
      .single();

    if (error) {
      console.error("[Boards] Update error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[Boards] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** DELETE /api/admin/boards/[id] — delete board (only if more than 1 exists) */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createAdminClient();

    // Check how many boards exist
    const { count } = await supabase
      .from("boards")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Не можна видалити єдину дошку" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("boards").delete().eq("id", id);

    if (error) {
      console.error("[Boards] Delete error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Boards] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
