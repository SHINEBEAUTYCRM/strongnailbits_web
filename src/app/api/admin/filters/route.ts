import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getAdminUser } from "@/lib/admin/auth";
import { logAction } from "@/lib/admin/audit";
import { slugify } from "@/utils/slugify";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  GET — list filters                                                 */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search")?.toLowerCase();
  const categoryId = sp.get("category_id");
  const active = sp.get("active");

  const supabase = createAdminClient();

  let q = supabase
    .from("filters")
    .select("*")
    .order("position", { ascending: true })
    .order("name_uk", { ascending: true });

  if (active === "true") q = q.eq("is_active", true);
  if (active === "false") q = q.eq("is_active", false);

  const { data: filters, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let list = filters || [];

  if (search) {
    list = list.filter(
      (f) =>
        f.name_uk?.toLowerCase().includes(search) ||
        f.name_ru?.toLowerCase().includes(search) ||
        f.handle?.toLowerCase().includes(search),
    );
  }

  const filterIds = list.map((f) => f.id);
  const featureIds = list.filter((f) => f.feature_id).map((f) => f.feature_id);

  const categoryCounts = new Map<string, number>();
  const featureNames = new Map<string, string>();

  if (filterIds.length > 0) {
    const { data: fc } = await supabase
      .from("filter_categories")
      .select("filter_id")
      .in("filter_id", filterIds);
    for (const r of fc || []) {
      categoryCounts.set(r.filter_id, (categoryCounts.get(r.filter_id) || 0) + 1);
    }

    if (categoryId) {
      const { data: catFilters } = await supabase
        .from("filter_categories")
        .select("filter_id")
        .eq("category_id", categoryId)
        .in("filter_id", filterIds);
      const catSet = new Set((catFilters || []).map((r) => r.filter_id));
      list = list.filter((f) => catSet.has(f.id));
    }
  }

  if (featureIds.length > 0) {
    const { data: features } = await supabase
      .from("features")
      .select("id, name_uk")
      .in("id", featureIds);
    for (const f of features || []) {
      featureNames.set(f.id, f.name_uk || "");
    }
  }

  const result = list.map((f) => ({
    ...f,
    feature_name: f.feature_id ? featureNames.get(f.feature_id) || null : null,
    categories_count: categoryCounts.get(f.id) || 0,
  }));

  return NextResponse.json({ filters: result });
}

/* ------------------------------------------------------------------ */
/*  POST — create filter                                               */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const adminUser = await getAdminUser();
  const body = await request.json();
  const {
    name_uk, name_ru, source_type, feature_id,
    display_type, position, collapsed, category_ids,
  } = body;

  if (!name_uk) {
    return NextResponse.json({ error: "name_uk required" }, { status: 400 });
  }

  const handle = body.handle || slugify(name_uk) || `filter-${Date.now()}`;
  const supabase = createAdminClient();

  const { data: dup } = await supabase.from("filters").select("id").eq("handle", handle).single();
  if (dup) {
    return NextResponse.json({ error: "Handle already exists" }, { status: 409 });
  }

  const { data: filter, error } = await supabase
    .from("filters")
    .insert({
      name_uk,
      name_ru: name_ru || null,
      handle,
      source_type: source_type || "feature",
      feature_id: feature_id || null,
      display_type: display_type || "checkbox",
      position: position ?? 0,
      is_active: true,
      collapsed: collapsed ?? false,
    })
    .select()
    .single();

  if (error || !filter) {
    return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });
  }

  if (Array.isArray(category_ids) && category_ids.length > 0) {
    const rows = category_ids.map((cid: string) => ({
      filter_id: filter.id,
      category_id: cid,
    }));
    await supabase.from("filter_categories").insert(rows);
  }

  if (adminUser) {
    await logAction({
      user: adminUser,
      entity: "filter",
      entity_id: filter.id,
      action: "create",
      after: { name_uk, handle, source_type },
      request,
    });
  }

  return NextResponse.json({ ok: true, filter }, { status: 201 });
}
