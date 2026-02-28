import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const PRODUCT_FIELDS = `
  id, slug, name_uk, name_ru, price, old_price, 
  main_image_url, status, quantity, is_new, is_featured,
  brands(name)
`;

const getHomeData = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const [
      bannersRes, categoryBlocksRes, dealRes,
      quickCatsRes, featuresRes, promoRes
    ] = await Promise.all([
      supabase.from("banners").select("*")
        .eq("type", "hero_slider").eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("sort_order").limit(5),

      supabase.from("home_category_blocks").select(`
          id, title_override_uk, title_override_ru,
          subtitle_uk, subtitle_ru,
          children_limit, sort_order, show_on_web, show_on_app,
          categories!inner(id, slug, name_uk, name_ru, image_url, cs_cart_id)
        `)
        .eq("is_enabled", true).order("sort_order"),

      supabase.from("deal_of_day").select("*")
        .eq("is_enabled", true).gt("end_at", now)
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle(),

      supabase.from("quick_categories")
        .select("*, categories(id, name_uk, name_ru, slug, image_url)")
        .eq("is_enabled", true).order("sort_order"),

      supabase.from("service_features").select("*")
        .eq("is_enabled", true).order("sort_order"),

      supabase.from("banners").select("*")
        .eq("type", "promo_strip").eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("priority", { ascending: false }).limit(3),
    ]);

    const categoryBlocks = [];
    for (const block of categoryBlocksRes.data || []) {
      const parent = (block as any).categories;
      if (!parent) continue;

      const { data: children } = await supabase
        .from("categories")
        .select("id, slug, name_uk, name_ru, image_url, product_count")
        .eq("parent_cs_cart_id", parent.cs_cart_id)
        .eq("status", "active")
        .gt("product_count", 0)
        .order("position")
        .limit(block.children_limit || 4);

      categoryBlocks.push({
        id: block.id,
        title_uk: block.title_override_uk || parent.name_uk,
        title_ru: block.title_override_ru || parent.name_ru,
        subtitle_uk: block.subtitle_uk,
        subtitle_ru: block.subtitle_ru,
        parent_slug: parent.slug,
        show_on_web: block.show_on_web,
        show_on_app: block.show_on_app,
        children: children || [],
      });
    }

    let dealProducts: any[] = [];
    if (dealRes.data?.product_ids?.length) {
      const { data } = await supabase
        .from("products").select(PRODUCT_FIELDS)
        .in("id", dealRes.data.product_ids)
        .eq("status", "active");
      dealProducts = data || [];
    }

    return {
      banners: bannersRes.data || [],
      promo: promoRes.data || [],
      categoryBlocks,
      quickCategories: quickCatsRes.data || [],
      deal: dealRes.data ? { ...dealRes.data, products: dealProducts } : null,
      features: featuresRes.data || [],
    };
  },
  ["app-home-data"],
  { revalidate: 60, tags: ["home"] }
);

export async function GET() {
  try {
    const data = await getHomeData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API:AppHome] Error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
