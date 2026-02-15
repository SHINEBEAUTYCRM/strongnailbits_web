import { createAdminClient } from "@/lib/supabase/admin";
import { getCategoryTree } from "@/lib/categories/tree";
import { getLanguage } from "@/lib/language";

/* Components */
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { HeroBannerDynamic } from "@/components/home/HeroBannerDynamic";
import { TopBar } from "@/components/home/TopBar";
import { QuickCategoriesDynamic } from "@/components/home/QuickCategoriesDynamic";
import { ProductSection } from "@/components/home/ProductSection";
import { DealOfDayDynamic } from "@/components/home/DealOfDayDynamic";
import { FeaturesDynamic } from "@/components/home/FeaturesDynamic";
import { B2BCtaDynamic } from "@/components/home/B2BCtaDynamic";
import { CatalogButton } from "@/components/home/CatalogButton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

/** ISR: revalidate homepage every 2 minutes */
export const revalidate = 120;

const PRODUCT_FIELDS =
  "id, name_uk, name_ru, slug, price, old_price, main_image_url, status, quantity, is_new, is_featured, brands(name)";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function getHomepageData() {
  const supabase = createAdminClient();

  // 1. Sections — ordering
  const { data: sections } = await supabase
    .from("homepage_sections")
    .select("*")
    .eq("is_enabled", true)
    .order("sort_order");

  // 2. Product showcases
  const { data: showcases } = await supabase
    .from("product_showcases")
    .select("*")
    .eq("is_enabled", true)
    .order("sort_order");

  // 3. Fetch products for each showcase
  const showcaseProducts: Record<string, any[]> = {};
  for (const sc of showcases || []) {
    const rule = (sc.rule as Record<string, any>) || {};
    let query = supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("status", "active")
      .gt("quantity", 0);

    if (rule.has_discount) query = query.gt("old_price", 0);
    if (rule.is_new) query = query.eq("is_new", true);
    if (rule.is_featured) query = query.eq("is_featured", true);
    if (rule.category_id) query = query.eq("category_id", rule.category_id);
    if (rule.brand_id) query = query.eq("brand_id", rule.brand_id);

    switch (rule.sort) {
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "discount":
        query = query.order("old_price", { ascending: false });
        break;
      case "featured":
        query = query.order("is_featured", { ascending: false });
        break;
      default: // popular
        query = query.order("quantity", { ascending: false });
    }

    const { data: products } = await query.limit(sc.product_limit || 14);
    showcaseProducts[sc.code] = products || [];
  }

  // 4. Deal of the Day
  const { data: deal } = await supabase
    .from("deal_of_day")
    .select("*")
    .eq("is_enabled", true)
    .gt("end_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Deal products
  let dealProducts: any[] = [];
  if (deal?.product_ids?.length) {
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .in("id", deal.product_ids)
      .eq("status", "active");
    dealProducts = data || [];
  }

  // 5. Quick categories
  const { data: quickCats } = await supabase
    .from("quick_categories")
    .select("*, categories(id, name_uk, name_ru, slug, image_url)")
    .eq("is_enabled", true)
    .order("sort_order");

  // 6. Features
  const { data: features } = await supabase
    .from("service_features")
    .select("*")
    .eq("is_enabled", true)
    .order("sort_order");

  // 7. Content blocks
  const { data: b2bBlock } = await supabase
    .from("content_blocks")
    .select("*")
    .eq("code", "b2b_cta")
    .eq("is_enabled", true)
    .single();

  // 8. Top bar
  const { data: topBarLinks } = await supabase
    .from("top_bar_links")
    .select("*")
    .eq("is_enabled", true)
    .order("sort_order");

  return {
    sections: sections || [],
    showcases: showcases || [],
    showcaseProducts,
    deal,
    dealProducts,
    quickCats: quickCats || [],
    features: features || [],
    b2bBlock,
    topBarLinks: topBarLinks || [],
  };
}

export default async function HomePage() {
  const [homeData, categories, lang] = await Promise.all([
    getHomepageData(),
    getCategoryTree(),
    getLanguage(),
  ]);

  const {
    sections,
    showcases,
    showcaseProducts,
    deal,
    dealProducts,
    quickCats,
    features,
    b2bBlock,
    topBarLinks,
  } = homeData;

  /* Render a section by its code */
  const renderSection = (section: any) => {
    switch (section.code) {
      case "top_bar":
        return topBarLinks.length > 0 ? (
          <TopBar key={section.id} links={topBarLinks} lang={lang} />
        ) : null;

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
        // Product showcases: showcase_hits, showcase_new, showcase_sale, etc.
        if (section.section_type === "product_showcase") {
          const showcaseCode = section.config?.showcase_code;
          const sc = showcases.find((s: any) => s.code === showcaseCode);
          const products = showcaseProducts[showcaseCode];
          if (!sc || !products?.length) return null;

          const title =
            lang === "ru" ? sc.title_ru || sc.title_uk : sc.title_uk;
          const ctaText =
            lang === "ru"
              ? sc.cta_text_ru || sc.cta_text_uk
              : sc.cta_text_uk;

          return (
            <ScrollReveal key={section.id}>
              <ProductSection
                title={title}
                products={products}
                lang={lang}
                linkHref={sc.cta_url || undefined}
                linkText={ctaText || undefined}
                priorityCount={showcaseCode === "hits" ? 4 : 0}
              />
            </ScrollReveal>
          );
        }
        return null;
    }
  };

  /* Split sections: top_bar separate, hero separate, rest in main flow */
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
          {mainSections.map(renderSection)}
        </div>
      </div>
    </div>
  );
}
