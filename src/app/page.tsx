import { createAdminClient } from "@/lib/supabase/admin";
import { getCategoryTree } from "@/lib/categories/tree";
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { HeroBanner } from "@/components/home/HeroBanner";
import { QuickCategories } from "@/components/home/QuickCategories";

/** ISR: revalidate homepage every 2 minutes */
export const revalidate = 120;
import { CatalogButton } from "@/components/home/CatalogButton";
import { ProductSection } from "@/components/home/ProductSection";
import { Features } from "@/components/home/Features";
import { B2BCta } from "@/components/home/B2BCta";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const PRODUCT_FIELDS =
  "id, name_uk, slug, price, old_price, main_image_url, status, quantity, is_new, is_featured, brands(name)";

async function getHomeData() {
  const supabase = createAdminClient();

  const [popularRes, saleRes, newRes] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("status", "active")
      .gt("quantity", 0)
      .order("quantity", { ascending: false })
      .limit(14),

    supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("status", "active")
      .gt("old_price", 0)
      .gt("quantity", 0)
      .order("old_price", { ascending: false })
      .limit(14),

    supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("status", "active")
      .gt("quantity", 0)
      .order("created_at", { ascending: false })
      .limit(14),
  ]);

  return {
    popularProducts: popularRes.data ?? [],
    saleProducts: saleRes.data ?? [],
    newProducts: newRes.data ?? [],
  };
}

export default async function HomePage() {
  const [{ popularProducts, saleProducts, newProducts }, categories] =
    await Promise.all([getHomeData(), getCategoryTree()]);

  return (
    <div className="pb-12 md:pb-16">
      {/* ── Top area: sidebar + banner ── */}
      <div className="mx-auto max-w-[1400px] px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex gap-5">
          {/* Desktop sidebar */}
          <HomeSidebar categories={categories} />

          {/* Main column */}
          <div className="min-w-0 flex-1">
            {/* Banner slider */}
            <HeroBanner />

            {/* Quick category chips */}
            <div className="mt-4">
              <QuickCategories categories={categories} />
            </div>
          </div>
        </div>

        {/* Mobile catalog button */}
        <div className="mt-4 lg:hidden">
          <CatalogButton />
        </div>
      </div>

      {/* ── Product sections (full width) ── */}
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <ProductSection
          title="Популярні товари"
          products={popularProducts}
          linkHref="/catalog"
          linkText="Дивитись всі →"
        />

        <ProductSection
          title="Зі знижкою"
          products={saleProducts}
          linkHref="/catalog?in_stock=true&sort=discount"
          linkText="Всі акції →"
        />

        <ProductSection
          title="Новинки"
          products={newProducts}
          linkHref="/catalog?sort=newest"
          linkText="Всі новинки →"
        />
      </div>

      {/* ── Features ── */}
      <ScrollReveal>
        <div className="mx-auto mt-14 max-w-[1400px] px-4 md:px-6">
          <Features />
        </div>
      </ScrollReveal>

      {/* ── B2B CTA ── */}
      <ScrollReveal>
        <div className="mx-auto mt-10 max-w-[1400px] px-4 md:px-6">
          <B2BCta />
        </div>
      </ScrollReveal>
    </div>
  );
}
