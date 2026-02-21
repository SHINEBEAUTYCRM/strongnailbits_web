import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/catalog/Breadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductBuySidebar } from "@/components/product/ProductBuySidebar";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { getLanguage, localizedName, localizedDescription } from "@/lib/language";
import { TrackProductView } from "@/components/analytics/TrackProductView";

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
      "id, name_uk, name_ru, slug, sku, description_uk, description_ru, price, old_price, wholesale_price, quantity, status, main_image_url, images, weight, properties, meta_title, meta_description, is_featured, is_new, category_id, brand_id, cs_cart_id, external_id, ai_metadata, enrichment_status, photo_sources, created_at, updated_at",
    )
    .eq("slug", slug)
    .single();

  if (!data) return null;

  let brand = null;
  let category = null;

  if (data.brand_id) {
    const { data: b } = await supabase
      .from("brands")
      .select("name, slug")
      .eq("id", data.brand_id)
      .single();
    brand = b;
  }

  if (data.category_id) {
    const { data: c } = await supabase
      .from("categories")
      .select("slug, name_uk, name_ru, parent_cs_cart_id, cs_cart_id")
      .eq("id", data.category_id)
      .single();
    category = c;
  }

  return { ...data, brands: brand, categories: category };
}

async function getProductFeatures(productId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_feature_values")
    .select("features(name_uk, name_ru, status, position), feature_variants(value_uk, value_ru)")
    .eq("product_id", productId);

  if (!data) return {};

  const result: Record<string, string> = {};
  for (const row of data) {
    const feature = row.features as unknown as { name_uk: string; name_ru: string | null; status: string; position: number } | null;
    const variant = row.feature_variants as unknown as { value_uk: string; value_ru: string | null } | null;
    if (!feature || !variant || feature.status !== "active") continue;
    result[feature.name_uk] = variant.value_uk;
  }
  return result;
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
          .select("slug, name_uk, name_ru, parent_cs_cart_id")
          .eq("cs_cart_id", currentParentId)
          .single();

        const cat = data as {
          slug: string;
          name_uk: string;
          name_ru: string | null;
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
  const lang = await getLanguage();

  const brandData = product.brands as
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
  const brand = Array.isArray(brandData) ? brandData[0] ?? null : brandData;

  const categoryData = product.categories as
    | { slug: string; name_uk: string; name_ru: string | null; parent_cs_cart_id: number | null; cs_cart_id: number }
    | { slug: string; name_uk: string; name_ru: string | null; parent_cs_cart_id: number | null; cs_cart_id: number }[]
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

  const productName = localizedName(product, lang);
  // AI description takes priority, fallback to CS-Cart
  const aiDescription = (product.ai_metadata as Record<string, unknown> | null)?.description_uk as string | undefined;
  const productDescription = aiDescription || localizedDescription(product, lang);
  const categoryName = category ? localizedName(category, lang) : null;

  const breadcrumbs = await buildBreadcrumbs(
    category?.slug ?? null,
    categoryName,
    category?.parent_cs_cart_id ?? null,
    productName,
    product.slug,
  );

  const properties = await getProductFeatures(product.id);

  // Check B2B individual price for logged-in user
  let b2bPrice: number | null = null;
  try {
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();
    if (user && product.external_id) {
      const { data: profile } = await userSupabase.from("profiles").select("external_id, is_b2b").eq("id", user.id).single();
      if (profile?.is_b2b && profile.external_id) {
        const admin = createAdminClient();
        const { data: cp } = await admin.from("customer_prices")
          .select("price")
          .eq("customer_external_id", profile.external_id)
          .eq("product_external_id", product.external_id)
          .single();
        if (cp?.price) b2bPrice = Number(cp.price);
      }
    }
  } catch (err) { console.error('[Product] B2B price fetch failed:', err); }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    image: allImages.length > 0 ? allImages : undefined,
    description: product.meta_description || productName,
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
      <TrackProductView
        productId={product.id}
        name={productName}
        price={product.price}
        brand={brand?.name}
        category={categoryName || undefined}
      />
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
            {productName}
          </h1>
        </div>

        {/* ── 3-column layout (desktop) ── */}
        <div className="flex flex-col gap-6 lg:mt-4 lg:flex-row lg:gap-8">
          {/* Left — Gallery */}
          <div className="w-full lg:w-[42%]">
            <ProductGallery images={allImages} name={productName} />
          </div>

          {/* Center — Details (desktop only, on mobile appears after sidebar) */}
          <div className="hidden w-full lg:block lg:w-[30%]">
            <ProductInfo
              name={productName}
              sku={product.sku}
              brand={brand}
              properties={properties}
              description={productDescription}
            />
          </div>

          {/* Right — Buy sidebar */}
          <div className="w-full lg:w-[28%]">
            <div className="lg:sticky lg:top-[80px]">
              <ProductBuySidebar
                productId={product.id}
                slug={product.slug}
                name={productName}
                price={b2bPrice ?? product.price}
                oldPrice={b2bPrice ? product.price : product.old_price}
                quantity={product.quantity}
                status={product.status}
                sku={product.sku}
                image={product.main_image_url}
                brand={brand?.name ?? null}
                isB2bPrice={!!b2bPrice}
              />
            </div>
          </div>

          {/* Mobile: details below sidebar */}
          <div className="w-full lg:hidden">
            <ProductInfo
              name={productName}
              sku={product.sku}
              brand={brand}
              properties={properties}
              description={productDescription}
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
