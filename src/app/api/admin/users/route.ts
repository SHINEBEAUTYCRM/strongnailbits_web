import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/* GET — list admin/manager users */
export async function GET() {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, role, admin_approved, is_active, created_at")
      .in("role", ["admin", "manager"])
      .order("created_at", { ascending: false });

    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

/* PATCH — approve, block, change role */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const body = await request.json();
    const supabase = createAdminClient();

    const { action, id } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (action === "approve") {
      await supabase.from("profiles").update({ admin_approved: true, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "block") {
      await supabase.from("profiles").update({ admin_approved: false, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "set-role") {
      const { role } = body;
      if (!["admin", "manager"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      await supabase.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "remove") {
      // Downgrade to regular user, remove admin access
      await supabase.from("profiles").update({ role: "user", admin_approved: false, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
