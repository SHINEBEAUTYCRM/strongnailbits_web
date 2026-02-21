import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  GET — single filter with categories                                */
/* ------------------------------------------------------------------ */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: filter, error } = await supabase
    .from("filters")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !filter) {
    return NextResponse.json({ error: "Filter not found" }, { status: 404 });
  }

  const { data: cats } = await supabase
    .from("filter_categories")
    .select("category_id, categories(id, name_uk, slug)")
    .eq("filter_id", id);

  return NextResponse.json({
    ...filter,
    categories: (cats || []).map((c) => c.categories),
    category_ids: (cats || []).map((c) => c.category_id),
  });
}

/* ------------------------------------------------------------------ */
/*  PUT — update filter                                                */
/* ------------------------------------------------------------------ */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data: existing } = await supabase.from("filters").select("*").eq("id", id).single();
  if (!existing) {
    return NextResponse.json({ error: "Filter not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name_uk !== undefined) patch.name_uk = body.name_uk;
  if (body.name_ru !== undefined) patch.name_ru = body.name_ru || null;
  if (body.handle !== undefined) patch.handle = body.handle;
  if (body.source_type !== undefined) patch.source_type = body.source_type;
  if (body.feature_id !== undefined) patch.feature_id = body.feature_id || null;
  if (body.display_type !== undefined) patch.display_type = body.display_type;
  if (body.position !== undefined) patch.position = Number(body.position);
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.collapsed !== undefined) patch.collapsed = body.collapsed;

  const { error } = await supabase.from("filters").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(body.category_ids)) {
    await supabase.from("filter_categories").delete().eq("filter_id", id);
    if (body.category_ids.length > 0) {
      const rows = body.category_ids.map((cid: string) => ({
        filter_id: id,
        category_id: cid,
      }));
      await supabase.from("filter_categories").insert(rows);
    }
  }

  await logAction({
    user: auth.user as Parameters<typeof logAction>[0]["user"],
    entity: "filter",
    entity_id: id,
    action: "update",
    before: existing,
    after: patch,
    request,
  });

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ */
/*  DELETE                                                             */
/* ------------------------------------------------------------------ */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: filter } = await supabase.from("filters").select("name_uk, source_type").eq("id", id).single();

  await supabase.from("filter_categories").delete().eq("filter_id", id);
  const { error } = await supabase.from("filters").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    user: auth.user as Parameters<typeof logAction>[0]["user"],
    entity: "filter",
    entity_id: id,
    action: "delete",
    before: filter,
    request,
  });

  return NextResponse.json({ ok: true });
}
