import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { slugify } from "@/utils/slugify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function mapDisplayType(featureType: string): string {
  switch (featureType) {
    case "E": return "color";
    case "N": return "range";
    case "C": return "toggle";
    default: return "checkbox";
  }
}

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { data: features } = await supabase
    .from("features")
    .select("id, name_uk, name_ru, slug, feature_type, filter_position")
    .eq("is_filter", true)
    .eq("status", "active")
    .order("filter_position", { ascending: true });

  const { data: existingFilters } = await supabase
    .from("filters")
    .select("feature_id, handle");

  const existingByFeature = new Set((existingFilters || []).filter((f) => f.feature_id).map((f) => f.feature_id));
  const existingHandles = new Set((existingFilters || []).map((f) => f.handle));

  let filtersCreated = 0;
  let bindingsCreated = 0;

  for (const f of features || []) {
    if (existingByFeature.has(f.id)) continue;

    const handle = f.slug || slugify(f.name_uk || "") || `filter-${f.id.slice(0, 8)}`;
    if (existingHandles.has(handle)) continue;

    const { data: filter, error } = await supabase
      .from("filters")
      .insert({
        name_uk: f.name_uk,
        name_ru: f.name_ru || null,
        handle,
        source_type: "feature",
        feature_id: f.id,
        display_type: mapDisplayType(f.feature_type),
        position: f.filter_position ?? filtersCreated,
        is_active: true,
        collapsed: false,
      })
      .select("id")
      .single();

    if (error || !filter) continue;
    filtersCreated++;
    existingHandles.add(handle);

    const { data: catBindings } = await supabase
      .from("category_features")
      .select("category_id")
      .eq("feature_id", f.id);

    if (catBindings && catBindings.length > 0) {
      const rows = catBindings.map((cb) => ({
        filter_id: filter.id,
        category_id: cb.category_id,
      }));
      const { error: fcErr } = await supabase.from("filter_categories").insert(rows);
      if (!fcErr) bindingsCreated += rows.length;
    }
  }

  if (!existingHandles.has("price")) {
    const { error } = await supabase.from("filters").insert({
      name_uk: "Ціна",
      name_ru: "Цена",
      handle: "price",
      source_type: "price",
      feature_id: null,
      display_type: "range",
      position: 0,
      is_active: true,
      collapsed: false,
    });
    if (!error) filtersCreated++;
  }

  if (!existingHandles.has("brand")) {
    const { error } = await supabase.from("filters").insert({
      name_uk: "Бренд",
      name_ru: "Бренд",
      handle: "brand",
      source_type: "brand",
      feature_id: null,
      display_type: "checkbox",
      position: 1,
      is_active: true,
      collapsed: false,
    });
    if (!error) filtersCreated++;
  }

  return NextResponse.json({ filters_created: filtersCreated, bindings_created: bindingsCreated });
}
