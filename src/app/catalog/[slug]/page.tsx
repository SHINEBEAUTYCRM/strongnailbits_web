import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/catalog/Breadcrumbs";
import { Filters } from "@/components/catalog/Filters";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { getProductWord } from "@/utils/format";
import {
  parseSearchParams,
  fetchFilteredProducts,
  fetchBrandsForFilter,
  buildFilteredUrl,
  getCategoryScopeData,
} from "@/lib/catalog/filters";
import { getLanguage, localizedName, type Lang } from "@/lib/language";

/** ISR: revalidate category pages every 2 minutes */
export const revalidate = 120;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

interface CategoryRow {
  id: string;
  slug: string;
  name_uk: string;
  name_ru: string | null;
  cs_cart_id: number;
  parent_cs_cart_id: number | null;
  image_url: string | null;
  product_count: number;
  description_uk: string | null;
  description_ru: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

async function getCategory(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();
  return data as CategoryRow | null;
}

async function buildBreadcrumbs(category: CategoryRow, lang: Lang): Promise<BreadcrumbItem[]> {
  const crumbs: BreadcrumbItem[] = [];
  const supabase = createAdminClient();
  let currentParentId = category.parent_cs_cart_id;
  const visited = new Set<number>();

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId);
    const { data: parent } = await supabase
      .from("categories")
      .select("slug, name_uk, name_ru, parent_cs_cart_id")
      .eq("cs_cart_id", currentParentId)
      .single();
    if (!parent) break;
    crumbs.unshift({ label: localizedName(parent, lang), href: `/catalog/${parent.slug}` });
    currentParentId = parent.parent_cs_cart_id;
  }

  crumbs.push({ label: localizedName(category, lang) });
  return crumbs;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Категорія не знайдена" };
  return {
    title: category.name_uk,
    description:
      category.description_uk ??
      `${category.name_uk} — купити оптом в SHINE SHOP. Доставка по Україні.`,
  };
}

const PER_PAGE = 24;

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const filters = parseSearchParams(sp);
  const lang = await getLanguage();

  const category = await getCategory(slug);
  if (!category) notFound();

  const basePath = `/catalog/${slug}`;

  const [scopeData, breadcrumbs] = await Promise.all([
    getCategoryScopeData(category.cs_cart_id),
    buildBreadcrumbs(category, lang),
  ]);

  const { descendantIds, children } = scopeData;

  const [{ products, total }, { brands, minPrice, maxPrice }] = await Promise.all([
    fetchFilteredProducts({ categoryIds: descendantIds, filters, perPage: PER_PAGE }),
    fetchBrandsForFilter(descendantIds),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs items={breadcrumbs} />

      {/* Mobile subcategory pills */}
      {children.length > 0 && (
        <div className="-mx-4 mb-4 px-4 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {children.map((child) => (
              <Link
                key={child.id}
                href={`/catalog/${child.slug}`}
                className="shrink-0 rounded-pill border border-[var(--border)] bg-white px-4 py-2 text-xs font-medium text-[var(--t2)] transition-all hover:border-coral hover:text-coral"
              >
                {localizedName(child, lang)}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-[80px] flex max-h-[calc(100dvh-100px)] flex-col gap-5 overflow-y-auto pr-1">
            {children.length > 0 && (
              <div>
                <h3 className="font-unbounded mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
                  Підкатегорії
                </h3>
                <ul className="flex flex-col">
                  {children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/catalog/${child.slug}`}
                        className="block border-b border-[var(--border)] py-1.5 text-sm text-[var(--t2)] transition-colors hover:text-coral"
                      >
                        {localizedName(child, lang)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {children.length > 0 && <div className="border-t border-[var(--border)]" />}

            <div>
              <h3 className="font-unbounded mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
                {lang === "ru" ? "Фильтры" : "Фільтри"}
              </h3>
              <Filters brands={brands} minPrice={minPrice} maxPrice={maxPrice} />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-6">
            <h1 className="font-unbounded text-2xl font-black text-dark sm:text-3xl">
              {localizedName(category, lang)}
            </h1>
          </div>

          <CatalogToolbar
            total={total}
            brands={brands}
            minPrice={minPrice}
            maxPrice={maxPrice}
            subcategories={children}
            categoryName={localizedName(category, lang)}
          />

          {products.length > 0 ? (
            <>
              <ProductGrid>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {products.map((product: any) => {
                  const brandData = product.brands as
                    | { name: string }
                    | { name: string }[]
                    | null;
                  const brandName = Array.isArray(brandData)
                    ? brandData[0]?.name
                    : brandData?.name;
                  return (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      slug={product.slug}
                      name={lang === "ru" ? (product.name_ru || product.name_uk) : product.name_uk}
                      price={product.price}
                      oldPrice={product.old_price}
                      imageUrl={product.main_image_url}
                      brand={brandName ?? null}
                      isNew={product.is_new}
                      isFeatured={product.is_featured}
                      status={product.status}
                      quantity={product.quantity}
                    />
                  );
                })}
              </ProductGrid>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-1">
                  {filters.page > 1 && (
                    <a
                      href={buildFilteredUrl(basePath, filters, { page: filters.page - 1 })}
                      className="flex h-10 items-center justify-center rounded-pill border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
                    >
                      ←
                    </a>
                  )}
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 10) p = i + 1;
                    else if (filters.page <= 5) p = i + 1;
                    else if (filters.page >= totalPages - 4) p = totalPages - 9 + i;
                    else p = filters.page - 4 + i;
                    const isActive = p === filters.page;
                    return (
                      <a
                        key={p}
                        href={buildFilteredUrl(basePath, filters, { page: p })}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
                          isActive
                            ? "bg-coral text-white"
                            : "bg-white text-[var(--t2)] hover:border-coral hover:text-coral"
                        }`}
                      >
                        {p}
                      </a>
                    );
                  })}
                  {filters.page < totalPages && (
                    <a
                      href={buildFilteredUrl(basePath, filters, { page: filters.page + 1 })}
                      className="flex h-10 items-center justify-center rounded-pill border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
                    >
                      →
                    </a>
                  )}
                </nav>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-card border border-[var(--border)] bg-white py-20 text-center">
              <p className="font-unbounded text-lg font-bold text-dark">
                Товари не знайдено
              </p>
              <p className="mt-2 text-sm text-[var(--t2)]">
                {children.length > 0
                  ? "Оберіть підкатегорію або змініть фільтри"
                  : "Спробуйте змінити фільтри"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
