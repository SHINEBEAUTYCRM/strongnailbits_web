import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 300;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!category) {
    return NextResponse.json({ filters: [] });
  }

  const { data: filterCats } = await supabase
    .from("filter_categories")
    .select("filter_id")
    .eq("category_id", category.id);

  const filterIds = (filterCats || []).map((fc) => fc.filter_id);

  const { data: globalFilters } = await supabase
    .from("filters")
    .select("*")
    .eq("is_active", true)
    .in("source_type", ["price", "brand"])
    .order("position", { ascending: true });

  let categoryFilters: typeof globalFilters = [];
  if (filterIds.length > 0) {
    const { data } = await supabase
      .from("filters")
      .select("*")
      .eq("is_active", true)
      .in("id", filterIds)
      .order("position", { ascending: true });
    categoryFilters = data || [];
  }

  const allFilters = [...(globalFilters || []), ...(categoryFilters || [])];
  const seen = new Set<string>();
  const deduped = allFilters.filter((f) => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });

  const result = [];

  for (const f of deduped) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const entry: any = {
      id: f.id,
      name_uk: f.name_uk,
      name_ru: f.name_ru,
      handle: f.handle,
      display_type: f.display_type,
      collapsed: f.collapsed,
      source_type: f.source_type,
      values: [],
    };

    if (f.source_type === "feature" && f.feature_id) {
      const { data: variants } = await supabase
        .from("feature_variants")
        .select("id, name_uk, name_ru, color_code, metadata")
        .eq("feature_id", f.feature_id)
        .order("position", { ascending: true });

      const variantIds = (variants || []).map((v) => v.id);

      const countMap = new Map<string, number>();
      if (variantIds.length > 0) {
        const { data: pf } = await supabase
          .from("product_features")
          .select("variant_id, products!inner(category_id)")
          .in("variant_id", variantIds)
          .eq("products.category_id", category.id);

        for (const row of pf || []) {
          if (row.variant_id) {
            countMap.set(row.variant_id, (countMap.get(row.variant_id) || 0) + 1);
          }
        }
      }

      entry.values = (variants || []).map((v) => ({
        id: v.id,
        label_uk: v.name_uk,
        label_ru: v.name_ru,
        count: countMap.get(v.id) || 0,
        metadata: v.metadata || (v.color_code ? { hex: v.color_code } : {}),
      }));
    } else if (f.source_type === "price") {
      const { data: priceRange } = await supabase
        .from("products")
        .select("price")
        .eq("category_id", category.id)
        .eq("status", "active")
        .order("price", { ascending: true });

      const prices = (priceRange || []).map((p) => Number(p.price)).filter((p) => p > 0);
      if (prices.length > 0) {
        entry.values = [{ min: prices[0], max: prices[prices.length - 1] }];
      }
    } else if (f.source_type === "brand") {
      const { data: products } = await supabase
        .from("products")
        .select("brand_id, brands(id, name)")
        .eq("category_id", category.id)
        .eq("status", "active")
        .not("brand_id", "is", null);

      const brandCounts = new Map<string, { name: string; count: number }>();
      for (const p of products || []) {
        if (!p.brand_id) continue;
        const existing = brandCounts.get(p.brand_id);
        const brandName = (p.brands as any)?.name || "";
        if (existing) {
          existing.count++;
        } else {
          brandCounts.set(p.brand_id, { name: brandName, count: 1 });
        }
      }

      entry.values = Array.from(brandCounts.entries()).map(([id, { name, count }]) => ({
        id,
        label_uk: name,
        label_ru: name,
        count,
        metadata: {},
      }));
    }

    result.push(entry);
  }

  return NextResponse.json({ filters: result });
}
