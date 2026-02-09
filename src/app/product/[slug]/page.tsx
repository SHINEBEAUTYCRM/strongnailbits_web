import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/catalog/Breadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductBuySidebar } from "@/components/product/ProductBuySidebar";
import { RelatedProducts } from "@/components/product/RelatedProducts";

/** ISR: revalidate product pages every 3 minutes */
export const revalidate = 180;

/* ------------------------------------------------------------------ */

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select(
      "*, brands(name, slug), categories(slug, name_uk, parent_cs_cart_id, cs_cart_id)",
    )
    .eq("slug", slug)
    .single();
  return data;
}

async function buildBreadcrumbs(
  categorySlug: string | null,
  categoryName: string | null,
  parentCsCartId: number | null,
  productName: string,
  productSlug: string,
): Promise<BreadcrumbItem[]> {
  const crumbs: BreadcrumbItem[] = [];

  if (categorySlug && categoryName) {
    if (parentCsCartId) {
      const supabase = createAdminClient();
      let currentParentId: number | null = parentCsCartId;
      const visited = new Set<number>();
      const ancestors: BreadcrumbItem[] = [];

      while (currentParentId && !visited.has(currentParentId)) {
        visited.add(currentParentId);
        const { data } = await supabase
          .from("categories")
          .select("slug, name_uk, parent_cs_cart_id")
          .eq("cs_cart_id", currentParentId)
          .single();

        const cat = data as {
          slug: string;
          name_uk: string;
          parent_cs_cart_id: number | null;
        } | null;

        if (!cat) break;
        ancestors.unshift({ label: cat.name_uk, href: `/catalog/${cat.slug}` });
        currentParentId = cat.parent_cs_cart_id;
      }
      crumbs.push(...ancestors);
    }

    crumbs.push({ label: categoryName, href: `/catalog/${categorySlug}` });
  }

  crumbs.push({ label: productName, href: `/product/${productSlug}` });
  return crumbs;
}

/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Товар не знайдено" };

  const title = product.meta_title || `${product.name_uk} | Купити в SHINE SHOP`;
  const description =
    product.meta_description ||
    `${product.name_uk} ціна від ${product.price} ₴. Доставка по Україні.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.main_image_url
        ? [{ url: product.main_image_url, width: 800, height: 800 }]
        : undefined,
      type: "website",
    },
  };
}

/* ------------------------------------------------------------------ */

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const brandData = product.brands as
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
  const brand = Array.isArray(brandData) ? brandData[0] ?? null : brandData;

  const categoryData = product.categories as
    | { slug: string; name_uk: string; parent_cs_cart_id: number | null; cs_cart_id: number }
    | { slug: string; name_uk: string; parent_cs_cart_id: number | null; cs_cart_id: number }[]
    | null;
  const category = Array.isArray(categoryData) ? categoryData[0] ?? null : categoryData;

  const allImages: string[] = [];
  if (product.main_image_url) allImages.push(product.main_image_url);
  if (product.images && Array.isArray(product.images)) {
    for (const img of product.images) {
      const url = typeof img === "string" ? img : (img as { url?: string })?.url;
      if (url && !allImages.includes(url)) allImages.push(url);
    }
  }

  const breadcrumbs = await buildBreadcrumbs(
    category?.slug ?? null,
    category?.name_uk ?? null,
    category?.parent_cs_cart_id ?? null,
    product.name_uk,
    product.slug,
  );

  const properties: Record<string, string> =
    product.properties && typeof product.properties === "object"
      ? (product.properties as Record<string, string>)
      : {};

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_uk,
    image: allImages.length > 0 ? allImages : undefined,
    description: product.meta_description || product.name_uk,
    sku: product.sku || undefined,
    brand: brand ? { "@type": "Brand", name: brand.name } : undefined,
    offers: {
      "@type": "Offer",
      url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/product/${product.slug}`,
      priceCurrency: "UAH",
      price: product.price,
      availability:
        product.status === "active" && product.quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:py-8">
        <Breadcrumbs items={breadcrumbs} />

        {/* Mobile: product name + brand ABOVE gallery */}
        <div className="mt-4 lg:hidden">
          {brand && (
            <a
              href={`/catalog?brands=${brand.slug}`}
              className="mb-1 inline-block text-[13px] font-medium text-[#007aff]"
            >
              {brand.name}
            </a>
          )}
          <h1 className="mb-4 text-[18px] font-bold leading-tight text-[#222]">
            {product.name_uk}
          </h1>
        </div>

        {/* ── 3-column layout (desktop) ── */}
        <div className="flex flex-col gap-6 lg:mt-4 lg:flex-row lg:gap-8">
          {/* Left — Gallery */}
          <div className="w-full lg:w-[42%]">
            <ProductGallery images={allImages} name={product.name_uk} />
          </div>

          {/* Center — Details (desktop only, on mobile appears after sidebar) */}
          <div className="hidden w-full lg:block lg:w-[30%]">
            <ProductInfo
              name={product.name_uk}
              sku={product.sku}
              brand={brand}
              properties={properties}
              description={product.description_uk}
            />
          </div>

          {/* Right — Buy sidebar */}
          <div className="w-full lg:w-[28%]">
            <div className="lg:sticky lg:top-[80px]">
              <ProductBuySidebar
                productId={product.id}
                slug={product.slug}
                name={product.name_uk}
                price={product.price}
                oldPrice={product.old_price}
                quantity={product.quantity}
                status={product.status}
                sku={product.sku}
                image={product.main_image_url}
                brand={brand?.name ?? null}
              />
            </div>
          </div>

          {/* Mobile: details below sidebar */}
          <div className="w-full lg:hidden">
            <ProductInfo
              name={product.name_uk}
              sku={product.sku}
              brand={brand}
              properties={properties}
              description={product.description_uk}
            />
          </div>
        </div>

        {/* Related products */}
        {product.category_id && (
          <RelatedProducts
            categoryId={product.category_id}
            excludeProductId={product.id}
          />
        )}
      </div>
    </>
  );
}
