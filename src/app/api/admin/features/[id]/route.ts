import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: feature, error } = await supabase
    .from("features")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !feature) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  const { data: variants } = await supabase
    .from("feature_variants")
    .select("*")
    .eq("feature_id", id)
    .order("position", { ascending: true })
    .order("name_uk", { ascending: true });

  const { count: productsCount } = await supabase
    .from("product_features")
    .select("id", { count: "exact", head: true })
    .eq("feature_id", id);

  return NextResponse.json({
    ...feature,
    variants: variants ?? [],
    products_count: productsCount ?? 0,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("features")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name_uk !== undefined) patch.name_uk = body.name_uk;
  if (body.name_ru !== undefined) patch.name_ru = body.name_ru || null;
  if (body.slug !== undefined) patch.slug = body.slug;
  if (body.feature_type !== undefined) patch.feature_type = body.feature_type;
  if (body.is_filter !== undefined) patch.is_filter = body.is_filter;
  if (body.filter_position !== undefined) patch.filter_position = Number(body.filter_position);
  if (body.status !== undefined) patch.status = body.status;

  if (body.slug && body.slug !== existing.slug) {
    const { data: dup } = await supabase
      .from("features")
      .select("id")
      .eq("slug", body.slug)
      .neq("id", id)
      .single();
    if (dup) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
  }

  const { error } = await supabase.from("features").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(body.variants)) {
    await supabase.from("feature_variants").delete().eq("feature_id", id);

    if (body.variants.length > 0) {
      const variantRows = body.variants.map((v: Record<string, unknown>, i: number) => ({
        feature_id: id,
        cs_cart_id: v.cs_cart_id || null,
        name_uk: v.name_uk || "",
        name_ru: v.name_ru || null,
        color_code: v.color_code || null,
        position: v.position ?? i,
        metadata: v.metadata || {},
      }));

      const { error: vErr } = await supabase.from("feature_variants").insert(variantRows);
      if (vErr) {
        return NextResponse.json({ error: `Feature updated but variants failed: ${vErr.message}` }, { status: 500 });
      }
    }
  }

  await logAction({
    user: auth.user as Parameters<typeof logAction>[0]["user"],
    entity: "feature",
    entity_id: id,
    action: "update",
    before: existing,
    after: patch,
    request,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("product_features")
    .select("id", { count: "exact", head: true })
    .eq("feature_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} product values linked. Disable instead.` },
      { status: 409 },
    );
  }

  const { data: feature } = await supabase.from("features").select("name_uk").eq("id", id).single();

  await supabase.from("feature_variants").delete().eq("feature_id", id);
  const { error } = await supabase.from("features").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAction({
    user: auth.user as Parameters<typeof logAction>[0]["user"],
    entity: "feature",
    entity_id: id,
    action: "delete",
    before: feature,
    request,
  });

  return NextResponse.json({ ok: true });
}
