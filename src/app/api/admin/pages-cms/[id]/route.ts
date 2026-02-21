import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getAdminUser } from "@/lib/admin/auth";
import { logAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* GET — single page */
export async function GET(_request: NextRequest, context: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = createAdminClient();

  const { data, error } = await supabase.from("pages").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ page: data });
}

/* PUT — update page */
export async function PUT(request: NextRequest, context: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const adminUser = await getAdminUser();

  const { id } = await context.params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.slug && body.slug !== existing.slug) {
    const { data: dup } = await supabase
      .from("pages")
      .select("id")
      .eq("slug", body.slug)
      .neq("id", id)
      .single();
    if (dup) {
      return NextResponse.json({ error: `Slug "${body.slug}" already exists` }, { status: 409 });
    }
  }

  const patch: Record<string, unknown> = {};
  const fields = [
    "title_uk", "title_ru", "slug", "content_uk", "content_ru",
    "meta_title_uk", "meta_title_ru", "meta_description_uk", "meta_description_ru",
    "status", "template", "position",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) patch[f] = body[f];
  }

  if (patch.status === "published" && !existing.published_at) {
    patch.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("pages").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (adminUser) {
    await logAction({
      user: adminUser,
      entity: "page",
      entity_id: id,
      action: "update",
      before: existing,
      after: patch,
      request,
    });
  }

  return NextResponse.json({ ok: true });
}

/* DELETE — delete page */
export async function DELETE(_request: NextRequest, context: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const adminUser = await getAdminUser();

  const { id } = await context.params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase.from("pages").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (adminUser) {
    await logAction({
      user: adminUser,
      entity: "page",
      entity_id: id,
      action: "delete",
      before: existing,
      request: _request,
    });
  }

  return NextResponse.json({ ok: true });
}
