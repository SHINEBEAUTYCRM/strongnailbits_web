import { createAdminClient } from "@/lib/supabase/admin";
import { getCategoryTree } from "@/lib/categories/tree";
import { getLanguage } from "@/lib/language-server";

/* Components */
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { HeroBannerDynamic } from "@/components/home/HeroBannerDynamic";
import { QuickCategoriesDynamic } from "@/components/home/QuickCategoriesDynamic";
import { ProductSection } from "@/components/home/ProductSection";
import { DealOfDayDynamic } from "@/components/home/DealOfDayDynamic";
import { FeaturesDynamic } from "@/components/home/FeaturesDynamic";
import { B2BCtaDynamic } from "@/components/home/B2BCtaDynamic";
import { CatalogButton } from "@/components/home/CatalogButton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

/** ISR: regenerate homepage every 60 s */
export const revalidate = 0;

const PRODUCT_FIELDS =
  "id, name_uk, name_ru, slug, price, old_price, main_image_url, status, quantity, is_new, is_featured, brands(name)";

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ─── Showcases: load all active → fetch products for each ─── */
async function getShowcases() {
  const supabase = createAdminClient();

  const { data: showcases, error } = await supabase
    .from("product_showcases")
    .select("*")
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[Homepage] showcases error:", error.message);
    return [];
  }
  if (!showcases?.length) return [];

  /* ── Pre-fetch ALL categories once to avoid N+1 queries ── */
  const { data: allCats } = await supabase
    .from("categories")
    .select("id, cs_cart_id, parent_cs_cart_id, status");

  const catsById = new Map<string, { cs_cart_id: number | null; parent_cs_cart_id: number | null; status: string }>();
  const catsByParentCsCart = new Map<number, string[]>();

  for (const c of allCats ?? []) {
    catsById.set(c.id, c);
    if (c.parent_cs_cart_id && c.status === "active") {
      const arr = catsByParentCsCart.get(c.parent_cs_cart_id) ?? [];
      arr.push(c.id);
      catsByParentCsCart.set(c.parent_cs_cart_id, arr);
    }
  }

  const results = await Promise.all(
    showcases.map(async (showcase: any) => {
      let query = supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("status", "active")
        .gt("quantity", 0);

      const rule = (showcase.rule as Record<string, any>) || {};

      if (rule.category_ids?.length > 0) {
        /* Resolve children in-memory instead of DB queries */
        const parentCsCartIds = rule.category_ids
          .map((id: string) => catsById.get(id)?.cs_cart_id)
          .filter(Boolean) as number[];

        const childIds = parentCsCartIds.flatMap(
          (csId: number) => catsByParentCsCart.get(csId) ?? [],
        );

        const allCatIds = [...new Set([...rule.category_ids, ...childIds])];
        query = query.in("category_id", allCatIds);
      } else if (rule.category_id) {
        query = query.eq("category_id", rule.category_id);
      }

      if (rule.brand_ids?.length > 0) {
        query = query.in("brand_id", rule.brand_ids);
      } else if (rule.brand_id) {
        query = query.eq("brand_id", rule.brand_id);
      }

      if (rule.has_discount) query = query.gt("old_price", 0);
      if (rule.is_new) query = query.eq("is_new", true);
      if (rule.is_featured) query = query.eq("is_featured", true);

      const sort = rule.sort || "popular";
      switch (sort) {
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "discount":
          query = query.order("old_price", { ascending: false });
          break;
        case "featured":
          query = query.order("is_featured", { ascending: false });
          break;
        default:
          query = query.order("quantity", { ascending: false });
      }

      query = query.limit(showcase.product_limit || 14);
      const { data, error: prodError } = await query;

      if (prodError) {
        console.error("[Homepage] products error for", showcase.code, prodError.message);
      }
      return { ...showcase, _products: data ?? [] };
    }),
  );

  return results.filter((s: any) => s._products.length > 0);
}

/* ─── Other homepage data (sections, deal, quick-cats, features, etc.) ─── */
async function getHomepageData() {
  const supabase = createAdminClient();

  /* Run all independent queries in parallel */
  const [
    { data: sections },
    { data: deal },
    { data: quickCats },
    { data: features },
    { data: b2bBlock },
    { data: topBarLinks },
  ] = await Promise.all([
    supabase
      .from("homepage_sections")
      .select("*")
      .eq("is_enabled", true)
      .order("sort_order"),
    supabase
      .from("deal_of_day")
      .select("*")
      .eq("is_enabled", true)
      .gt("end_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("quick_categories")
      .select("*, categories(id, name_uk, name_ru, slug, image_url)")
      .eq("is_enabled", true)
      .order("sort_order"),
    supabase
      .from("service_features")
      .select("*")
      .eq("is_enabled", true)
      .order("sort_order"),
    supabase
      .from("content_blocks")
      .select("*")
      .eq("code", "b2b_cta")
      .eq("is_enabled", true)
      .single(),
    supabase
      .from("top_bar_links")
      .select("*")
      .eq("is_enabled", true)
      .order("sort_order"),
  ]);

  /* Deal products depend on the deal query result */
  let dealProducts: any[] = [];
  if (deal?.product_ids?.length) {
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .in("id", deal.product_ids)
      .eq("status", "active");
    dealProducts = data || [];
  }

  return {
    sections: sections || [],
    deal,
    dealProducts,
    quickCats: quickCats || [],
    features: features || [],
    b2bBlock,
    topBarLinks: topBarLinks || [],
  };
}

export default async function HomePage() {
  const [homeData, showcases, categories, lang] = await Promise.all([
    getHomepageData(),
    getShowcases(),
    getCategoryTree(),
    getLanguage(),
  ]);

  const {
    sections,
    deal,
    dealProducts,
    quickCats,
    features,
    b2bBlock,
  } = homeData;

  /* Render a section by its code */
  const renderSection = (section: any) => {
    switch (section.code) {
      case "top_bar":
        return null;

      case "hero_slider":
        return <HeroBannerDynamic key={section.id} />;

      case "quick_categories":
        return quickCats.length > 0 ? (
          <div key={section.id} className="mt-4">
            <QuickCategoriesDynamic items={quickCats} lang={lang} />
          </div>
        ) : null;

      case "deal_of_day":
        return deal ? (
          <ScrollReveal key={section.id}>
            <DealOfDayDynamic deal={deal} products={dealProducts} lang={lang} />
          </ScrollReveal>
        ) : null;

      case "features":
        return features.length > 0 ? (
          <ScrollReveal key={section.id}>
            <FeaturesDynamic items={features} lang={lang} />
          </ScrollReveal>
        ) : null;

      case "b2b_cta":
        return b2bBlock ? (
          <ScrollReveal key={section.id}>
            <B2BCtaDynamic block={b2bBlock} lang={lang} />
          </ScrollReveal>
        ) : null;

      default:
        return null;
    }
  };

  /* Split sections */
  const topBarSection = sections.find((s: any) => s.code === "top_bar");
  const heroSection = sections.find((s: any) => s.code === "hero_slider");
  const quickCatSection = sections.find(
    (s: any) => s.code === "quick_categories",
  );
  const mainSections = sections.filter(
    (s: any) =>
      s.code !== "top_bar" &&
      s.code !== "hero_slider" &&
      s.code !== "quick_categories",
  );

  return (
    <div className="pb-12 md:pb-16">
      {/* Top Bar */}
      {topBarSection && renderSection(topBarSection)}

      {/* ── Top area: sidebar + banner ── */}
      <div className="mx-auto max-w-[1400px] px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex gap-5">
          {/* Desktop sidebar */}
          <HomeSidebar categories={categories} lang={lang} />

          {/* Main column */}
          <div className="min-w-0 flex-1">
            {/* Banner slider */}
            {heroSection && renderSection(heroSection)}

            {/* Quick category chips */}
            {quickCatSection && renderSection(quickCatSection)}
          </div>
        </div>

        {/* Mobile catalog button */}
        <div className="mt-4 lg:hidden">
          <CatalogButton />
        </div>
      </div>

      {/* ── Main sections (full width) ── */}
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="mt-8 space-y-10 md:mt-12 md:space-y-14">
          {/* Динамічні вітрини */}
          {showcases && showcases.length > 0 && showcases.map((showcase: any) => (
            <ProductSection
              key={showcase.id}
              title={lang === "ru" ? (showcase.title_ru || showcase.name_ru || showcase.title_uk || showcase.name_uk || "") : (showcase.title_uk || showcase.name_uk || "")}
              products={showcase._products || []}
              lang={lang}
              linkHref={showcase.cta_url || "/catalog"}
              linkText={lang === "ru" ? (showcase.cta_text_ru || "Смотреть все") : (showcase.cta_text_uk || "Дивитись все")}
            />
          ))}

          {/* Існуючі секції з homepage_sections */}
          {mainSections.map(renderSection)}
        </div>
      </div>
    </div>
  );
}
