import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAction } from "@/lib/admin/audit";
import { slugify } from "@/utils/slugify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const sp = request.nextUrl.searchParams;
  const search = sp.get("search")?.toLowerCase();
  const type = sp.get("type");
  const isFilter = sp.get("is_filter");

  let q = supabase
    .from("features")
    .select("*")
    .order("filter_position", { ascending: true })
    .order("name_uk", { ascending: true });

  if (type) q = q.eq("feature_type", type);
  if (isFilter === "true") q = q.eq("is_filter", true);
  if (isFilter === "false") q = q.eq("is_filter", false);

  const { data: features, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let list = features || [];
  if (search) {
    list = list.filter(
      (f) =>
        f.name_uk?.toLowerCase().includes(search) ||
        f.name_ru?.toLowerCase().includes(search) ||
        f.slug?.toLowerCase().includes(search),
    );
  }

  const ids = list.map((f) => f.id);
  const vMap = new Map<string, number>();
  const pMap = new Map<string, number>();

  if (ids.length > 0) {
    const [{ data: vc }, { data: pc }] = await Promise.all([
      supabase.from("feature_variants").select("feature_id").in("feature_id", ids),
      supabase.from("product_features").select("feature_id").in("feature_id", ids),
    ]);
    if (vc) for (const r of vc) vMap.set(r.feature_id, (vMap.get(r.feature_id) || 0) + 1);
    if (pc) for (const r of pc) pMap.set(r.feature_id, (pMap.get(r.feature_id) || 0) + 1);
  }

  const result = list.map((f) => ({
    ...f,
    variants_count: vMap.get(f.id) || 0,
    products_count: pMap.get(f.id) || 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name_uk, name_ru, feature_type, is_filter, filter_position, status, variants } = body;

  if (!name_uk) {
    return NextResponse.json({ error: "name_uk is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const slug = body.slug || slugify(name_uk) || `feature-${Date.now()}`;

  const { data: dup } = await supabase.from("features").select("id").eq("slug", slug).single();
  if (dup) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  const { data: feature, error } = await supabase
    .from("features")
    .insert({
      name_uk,
      name_ru: name_ru || null,
      slug,
      feature_type: feature_type || "T",
      is_filter: is_filter ?? false,
      filter_position: filter_position ?? 0,
      status: status || "active",
    })
    .select()
    .single();

  if (error || !feature) {
    return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });
  }

  if (Array.isArray(variants) && variants.length > 0) {
    const variantRows = variants.map((v: Record<string, unknown>, i: number) => ({
      feature_id: feature.id,
      name_uk: v.name_uk || "",
      name_ru: v.name_ru || null,
      color_code: v.color_code || null,
      position: v.position ?? i,
      metadata: v.metadata || {},
    }));
    await supabase.from("feature_variants").insert(variantRows);
  }

  await logAction({
    user: auth.user as Parameters<typeof logAction>[0]["user"],
    entity: "feature",
    entity_id: feature.id,
    action: "create",
    after: { name_uk, feature_type, slug },
    request,
  });

  return NextResponse.json({ ok: true, feature }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { updates } = await request.json();
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "updates array required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const errors: string[] = [];

  for (const u of updates) {
    if (!u.id) continue;
    const patch: Record<string, unknown> = {};
    if (u.is_filter !== undefined) patch.is_filter = u.is_filter;
    if (u.filter_position !== undefined) patch.filter_position = Number(u.filter_position);
    if (u.status !== undefined) patch.status = u.status;
    patch.updated_at = new Date().toISOString();

    const { error } = await supabase.from("features").update(patch).eq("id", u.id);
    if (error) errors.push(`${u.id}: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: updates.length });
}
