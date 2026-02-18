import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/catalog/Breadcrumbs";
import { getLanguage, localizedName } from "@/lib/language";

export const revalidate = 300; // 5 min ISR

interface BrandPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

const PRODUCT_FIELDS =
  "id, name_uk, name_ru, slug, price, old_price, main_image_url, status, quantity, is_new, is_featured, brands(name)";

const PER_PAGE = 24;

async function getBrand(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url, banner_url, description_uk, description_ru, country, website_url, meta_title, meta_description")
    .eq("slug", slug)
    .single();
  return data;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function getBrandProducts(brandId: string, page: number, sort?: string) {
  const supabase = createAdminClient();
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  let query = supabase
    .from("products")
    .select(PRODUCT_FIELDS, { count: "exact" })
    .eq("brand_id", brandId)
    .eq("status", "active");

  switch (sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "discount":
      query = query.gt("old_price", 0).order("old_price", { ascending: false });
      break;
    default:
      query = query.order("quantity", { ascending: false });
  }

  const { data, count } = await query.range(from, to);
  return { products: data || [], total: count || 0 };
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return { title: "Бренд не знайдено" };
  return {
    title: brand.meta_title || `${brand.name} — купити в SHINE SHOP`,
    description: brand.meta_description || `Купити продукцію ${brand.name} в інтернет-магазині SHINE SHOP. Оригінальна продукція, оптові ціни, швидка доставка по Україні.`,
  };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = await getBrand(slug);

  if (!brand) notFound();

  const page = Number(sp.page) || 1;
  const sort = sp.sort || "popular";
  const lang = await getLanguage();

  const { products, total } = await getBrandProducts(brand.id, page, sort);
  const totalPages = Math.ceil(total / PER_PAGE);

  const description = lang === "ru" ? (brand.description_ru || brand.description_uk) : brand.description_uk;

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Головна", href: "/" },
    { label: "Бренди", href: "/brands" },
    { label: brand.name },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <Breadcrumbs items={breadcrumbs} />

      {/* Brand header with banner */}
      {brand.banner_url && (
        <div className="relative mt-4 h-[160px] overflow-hidden rounded-2xl md:h-[240px]">
          <Image
            src={brand.banner_url}
            alt={brand.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {brand.logo_url && (
          <div className="flex h-20 w-32 items-center justify-center rounded-xl border border-[var(--border)] bg-white p-3">
            <Image
              src={brand.logo_url}
              alt={brand.name}
              width={120}
              height={60}
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h1 className="font-unbounded text-2xl font-black text-dark sm:text-3xl">
            {brand.name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-[var(--t2)]">
            <span>{total} товарів</span>
            {brand.country && (
              <>
                <span className="text-[#d4d4d8]">·</span>
                <span>{brand.country}</span>
              </>
            )}
            {brand.website_url && (
              <>
                <span className="text-[#d4d4d8]">·</span>
                <a href={brand.website_url} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">
                  Офіційний сайт ↗
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {description && (
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--t2)]">
          {description}
        </p>
      )}

      {/* Sort toolbar */}
      <div className="mt-8">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <p className="text-sm text-[var(--t2)]">{total} товарів</p>
          <div className="flex gap-2">
            {[
              { k: "popular", l: "Популярні" },
              { k: "newest", l: "Новинки" },
              { k: "price_asc", l: "Дешевші" },
              { k: "price_desc", l: "Дорожчі" },
              { k: "discount", l: "Зі знижкою" },
            ].map((s) => (
              <Link
                key={s.k}
                href={`/brands/${slug}?sort=${s.k}`}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={
                  sort === s.k
                    ? { background: "rgba(214,38,74,0.08)", color: "#D6264A" }
                    : { color: "var(--t2)" }
                }
              >
                {s.l}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Products grid */}
      <div className="mt-6">
        {products.length > 0 ? (
          <ProductGrid>
            {products.map((p: any) => {
              const brandData = p.brands;
              const brandName = Array.isArray(brandData)
                ? brandData[0]?.name
                : brandData?.name;

              return (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  slug={p.slug}
                  name={localizedName(p, lang)}
                  price={p.price}
                  oldPrice={p.old_price}
                  imageUrl={p.main_image_url}
                  brand={brandName ?? null}
                  isNew={p.is_new}
                  isFeatured={p.is_featured}
                  status={p.status ?? "active"}
                  quantity={p.quantity ?? 0}
                />
              );
            })}
          </ProductGrid>
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm text-[var(--t2)]">Товарів цього бренду поки немає</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .map((p) => (
              <Link
                key={p}
                href={`/brands/${slug}?sort=${sort}&page=${p}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors"
                style={
                  p === page
                    ? { background: "#D6264A", color: "white" }
                    : { background: "white", color: "var(--t2)", border: "1px solid var(--border)" }
                }
              >
                {p}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
