import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLanguage, localizedName } from "@/lib/language-server";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { getProductWord } from "@/utils/format";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  sanitize,
  getSearchVariants,
  buildTextOrFilter,
} from "@/utils/search-helpers";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Пошук: ${q}` : "Пошук",
    description: q
      ? `Результати пошуку за запитом "${q}" в STRONG NAIL BITS`
      : "Пошук товарів в STRONG NAIL BITS",
    robots: { index: false, follow: true },
  };
}

const PER_PAGE = 20;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);

  const breadcrumbs = [
    { label: "Головна", href: "/" },
    { label: "Пошук", href: "/search" },
    ...(query ? [{ label: query }] : []),
  ];

  if (!query) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />
        <div className="flex flex-col items-center gap-4 py-20">
          <Search size={48} className="text-[var(--t3)]" />
          <h1 className="font-unbounded text-2xl font-black text-dark">Пошук товарів</h1>
          <p className="text-sm text-[var(--t2)]">
            Введіть запит у поле пошуку вгорі сторінки
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["Гель-лак", "База", "Топ", "Фреза", "Пилка", "Kodi", "Масло"].map((q) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="rounded-pill border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--t2)] transition-all hover:border-coral hover:text-coral"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const lang = await getLanguage();
  const supabase = createAdminClient();
  const safeQ = sanitize(query);
  const words = safeQ.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) words.push(safeQ);

  const brandOrParts: string[] = [];
  for (const word of words) {
    const variants = getSearchVariants(word);
    for (const v of variants) {
      brandOrParts.push(`name.ilike.%${v}%`);
    }
  }

  const { data: matchingBrands } = await supabase
    .from("brands")
    .select("id, name")
    .or(brandOrParts.join(","));

  const brands = matchingBrands ?? [];

  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;
  const PRODUCT_FIELDS = ["name_uk", "name_ru", "sku", "description_uk"];

  let productQuery = supabase
    .from("products")
    .select(
      "id, slug, name_uk, name_ru, price, old_price, main_image_url, status, quantity, is_new, is_featured, brand_id, brands!products_brand_id_fkey(name)",
      { count: "exact" },
    )
    .eq("status", "active");

  for (const word of words) {
    const orParts = buildTextOrFilter(word, PRODUCT_FIELDS);
    const variants = getSearchVariants(word);
    const wordBrandIds = brands
      .filter((b) => variants.some((v) => b.name.toLowerCase().includes(v)))
      .map((b) => b.id);

    if (wordBrandIds.length > 0) {
      orParts.push(`brand_id.in.(${wordBrandIds.join(",")})`);
    }

    productQuery = productQuery.or(orParts.join(","));
  }

  const { data: products, count } = await productQuery
    .order("quantity", { ascending: false })
    .range(from, to);

  const totalProducts = count ?? 0;
  const totalPages = Math.ceil(totalProducts / PER_PAGE);
  const items = products ?? [];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <div className="mb-6">
        <h1 className="font-unbounded text-2xl font-black text-dark">
          Результати пошуку: &quot;{query}&quot;
        </h1>
        <p className="mt-1 text-sm text-[var(--t2)]">
          {totalProducts > 0
            ? `Знайдено ${totalProducts} ${getProductWord(totalProducts)}`
            : "Нічого не знайдено"}
        </p>
      </div>

      {items.length > 0 ? (
        <>
          <ProductGrid cols={5}>
            {items.map((product) => {
              const brand = product.brands as unknown as { name: string } | null;
              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  slug={product.slug}
                  name={localizedName(product, lang)}
                  price={Number(product.price)}
                  oldPrice={product.old_price ? Number(product.old_price) : null}
                  imageUrl={product.main_image_url}
                  brand={brand?.name}
                  isNew={product.is_new}
                  isFeatured={product.is_featured}
                  status={product.status}
                  quantity={product.quantity}
                />
              );
            })}
          </ProductGrid>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
                  className="rounded-pill border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
                >
                  ← Назад
                </Link>
              )}
              <span className="px-3 text-sm text-[var(--t3)]">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
                  className="rounded-pill border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
                >
                  Далі →
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16">
          <Search size={48} className="text-[var(--t3)]" />
          <p className="font-unbounded text-lg font-bold text-dark">Нічого не знайдено</p>
          <p className="text-sm text-[var(--t2)]">
            Спробуйте інший запит або перегляньте каталог
          </p>
          <Link
            href="/catalog"
            className="font-unbounded mt-4 rounded-pill bg-coral px-6 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral"
          >
            Перейти в каталог
          </Link>
        </div>
      )}
    </div>
  );
}
