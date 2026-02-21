import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getAdminUser } from "@/lib/admin/auth";
import { logAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const adminUser = await getAdminUser();

  const { id } = await context.params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data: existing } = await supabase.from("redirects").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (body.from_path !== undefined) patch.from_path = body.from_path;
  if (body.to_path !== undefined) patch.to_path = body.to_path;
  if (body.code !== undefined) patch.code = body.code;
  if (body.note !== undefined) patch.note = body.note;
  if (body.is_active !== undefined) patch.is_active = body.is_active;

  const { error } = await supabase.from("redirects").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (adminUser) {
    await logAction({
      user: adminUser,
      entity: "redirect",
      entity_id: id,
      action: "update",
      before: existing,
      after: patch,
      request,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const adminUser = await getAdminUser();

  const { id } = await context.params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase.from("redirects").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("redirects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (adminUser) {
    await logAction({
      user: adminUser,
      entity: "redirect",
      entity_id: id,
      action: "delete",
      before: existing,
      request: _request,
    });
  }

  return NextResponse.json({ ok: true });
}
