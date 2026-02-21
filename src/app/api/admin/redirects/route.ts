import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getAdminUser } from "@/lib/admin/auth";
import { logAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search")?.trim();
  const active = sp.get("active");

  const supabase = createAdminClient();
  let query = supabase
    .from("redirects")
    .select("*")
    .order("created_at", { ascending: false });

  if (active === "true") query = query.eq("is_active", true);
  if (active === "false") query = query.eq("is_active", false);
  if (search) {
    query = query.or(`from_path.ilike.%${search}%,to_path.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ redirects: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const adminUser = await getAdminUser();

  const body = await request.json();
  const { from_path, to_path, code, note } = body;

  if (!from_path?.trim() || !from_path.startsWith("/")) {
    return NextResponse.json({ error: "from_path must start with /" }, { status: 400 });
  }
  if (!to_path?.trim()) {
    return NextResponse.json({ error: "to_path is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: dup } = await supabase
    .from("redirects")
    .select("id")
    .eq("from_path", from_path.trim())
    .eq("is_active", true)
    .single();

  if (dup) {
    return NextResponse.json({ error: `Active redirect for "${from_path}" already exists` }, { status: 409 });
  }

  const row = {
    from_path: from_path.trim(),
    to_path: to_path.trim(),
    code: code === 302 ? 302 : 301,
    note: note?.trim() || null,
    is_active: true,
    hits: 0,
  };

  const { data: redirect, error } = await supabase.from("redirects").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (adminUser) {
    await logAction({
      user: adminUser,
      entity: "redirect",
      entity_id: redirect.id,
      action: "create",
      after: row,
      request,
    });
  }

  return NextResponse.json({ ok: true, redirect }, { status: 201 });
}
