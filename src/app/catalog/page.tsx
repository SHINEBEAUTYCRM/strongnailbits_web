import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategoryTree, type CategoryNode } from "@/lib/categories/tree";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { Filters } from "@/components/catalog/Filters";
import {
  parseSearchParams,
  fetchFilteredProducts,
  fetchBrandsForFilter,
  buildFilteredUrl,
} from "@/lib/catalog/filters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Каталог",
  description:
    "Повний каталог професійної nail-косметики. Гель-лаки, бази, топи, інструменти, декор та аксесуари.",
};

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const PER_PAGE = 24;

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const sp = await searchParams;
  const filters = parseSearchParams(sp);

  const hasFilters =
    filters.priceMin !== null ||
    filters.priceMax !== null ||
    filters.brandSlugs.length > 0 ||
    filters.inStock ||
    filters.sort !== "popular";

  // ── No filters → hierarchical category list ──
  if (!hasFilters && filters.page === 1) {
    const tree = await getCategoryTree();

    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="font-unbounded mb-6 text-2xl font-black text-dark sm:text-3xl">
          Каталог товарів
        </h1>

        <div className="overflow-hidden rounded-card border border-[var(--border)] bg-white">
          {/* Sale */}
          <Link
            href="/catalog?in_stock=true&sort=discount"
            className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 transition-colors hover:bg-sand"
          >
            <div className="flex items-center gap-3">
              <span className="text-base font-medium text-coral">Sale</span>
              <span className="rounded-md bg-coral px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Знижка!!!
              </span>
            </div>
            <ChevronRight size={18} className="text-[var(--t3)]" />
          </Link>

          {/* Бренди */}
          <Link
            href="/brands"
            className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 transition-colors hover:bg-sand"
          >
            <span className="text-base font-medium text-dark">Бренди</span>
            <ChevronRight size={18} className="text-[var(--t3)]" />
          </Link>

          {/* Top-level categories with subcategories */}
          {tree.map((cat, i) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              isLast={i === tree.length - 1}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── With filters → product grid ──
  const [{ products, total: totalProducts }, { brands, minPrice, maxPrice }] =
    await Promise.all([
      fetchFilteredProducts({ filters, perPage: PER_PAGE }),
      fetchBrandsForFilter(undefined),
    ]);

  const totalPages = Math.ceil(totalProducts / PER_PAGE);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/catalog"
          className="text-sm text-[var(--t2)] transition-colors hover:text-coral"
        >
          ← Каталог
        </Link>
        <h1 className="font-unbounded text-xl font-black text-dark sm:text-2xl">
          Результати
        </h1>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-[120px] flex max-h-[calc(100dvh-140px)] flex-col gap-4 overflow-y-auto">
            <div className="rounded-card border border-[var(--border)] bg-white p-4">
              <h3 className="font-unbounded mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
                Фільтри
              </h3>
              <Filters
                brands={brands}
                minPrice={minPrice}
                maxPrice={maxPrice}
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <CatalogToolbar
            total={totalProducts}
            brands={brands}
            minPrice={minPrice}
            maxPrice={maxPrice}
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
                      name={product.name_uk}
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

              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-1">
                  {filters.page > 1 && (
                    <a
                      href={buildFilteredUrl("/catalog", filters, {
                        page: filters.page - 1,
                      })}
                      className="flex h-10 items-center justify-center rounded-pill border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
                    >
                      ←
                    </a>
                  )}
                  {Array.from(
                    { length: Math.min(totalPages, 10) },
                    (_, i) => {
                      let p: number;
                      if (totalPages <= 10) p = i + 1;
                      else if (filters.page <= 5) p = i + 1;
                      else if (filters.page >= totalPages - 4)
                        p = totalPages - 9 + i;
                      else p = filters.page - 4 + i;
                      const isActive = p === filters.page;
                      return (
                        <a
                          key={p}
                          href={buildFilteredUrl("/catalog", filters, {
                            page: p,
                          })}
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
                            isActive
                              ? "bg-coral text-white"
                              : "bg-white text-[var(--t2)] hover:text-coral"
                          }`}
                        >
                          {p}
                        </a>
                      );
                    },
                  )}
                  {filters.page < totalPages && (
                    <a
                      href={buildFilteredUrl("/catalog", filters, {
                        page: filters.page + 1,
                      })}
                      className="flex h-10 items-center justify-center rounded-pill border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
                    >
                      →
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-card border border-[var(--border)] bg-white py-20 text-center">
              <p className="font-unbounded text-lg font-bold text-dark">
                Товари не знайдено
              </p>
              <p className="mt-2 text-sm text-[var(--t2)]">
                Спробуйте змінити фільтри або перегляньте весь каталог
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Hierarchical category row ── */
function CategoryRow({
  cat,
  isLast,
}: {
  cat: CategoryNode;
  isLast: boolean;
}) {
  const hasChildren = cat.children.length > 0;

  return (
    <div className={isLast ? "" : "border-b border-[var(--border)]"}>
      {/* Parent category */}
      <Link
        href={`/catalog/${cat.slug}`}
        className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-sand"
      >
        <span className="text-base font-medium text-dark">{cat.name_uk}</span>
        <ChevronRight size={18} className="text-[var(--t3)]" />
      </Link>

      {/* Children (subcategories) */}
      {hasChildren && (
        <div className="border-t border-[var(--border)] bg-sand/30 px-5 py-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {cat.children.map((child) => (
              <Link
                key={child.id}
                href={`/catalog/${child.slug}`}
                className="py-1 text-[13px] text-[var(--t2)] transition-colors hover:text-coral"
              >
                {child.name_uk}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
