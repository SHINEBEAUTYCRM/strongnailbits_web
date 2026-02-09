import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/catalog/Breadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { RelatedProducts } from "@/components/product/RelatedProducts";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

interface ProductRow {
  id: string;
  slug: string;
  name_uk: string;
  sku: string | null;
  price: number;
  old_price: number | null;
  quantity: number;
  status: string;
  main_image_url: string | null;
  images: string[] | null;
  description_uk: string | null;
  meta_title: string | null;
  meta_description: string | null;
  properties: Record<string, string> | null;
  category_id: string | null;
  brand_id: string | null;
  weight: number | null;
  is_new: boolean;
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

        const parentCat = data as {
          slug: string;
          name_uk: string;
          parent_cs_cart_id: number | null;
        } | null;

        if (!parentCat) break;
        ancestors.unshift({
          label: parentCat.name_uk,
          href: `/catalog/${parentCat.slug}`,
        });
        currentParentId = parentCat.parent_cs_cart_id;
      }
      crumbs.push(...ancestors);
    }

    crumbs.push({ label: categoryName, href: `/catalog/${categorySlug}` });
  }

  crumbs.push({ label: productName, href: `/product/${productSlug}` });
  return crumbs;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: "Товар не знайдено" };

  const title = product.meta_title || `${product.name_uk} | Купити в SHINE SHOP`;
  const description =
    product.meta_description ||
    `${product.name_uk} ціна від ${product.price} ₴. Доставка по Україні. Замовити в SHINE SHOP`;

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
    | {
        slug: string;
        name_uk: string;
        parent_cs_cart_id: number | null;
        cs_cart_id: number;
      }
    | {
        slug: string;
        name_uk: string;
        parent_cs_cart_id: number | null;
        cs_cart_id: number;
      }[]
    | null;
  const category = Array.isArray(categoryData)
    ? categoryData[0] ?? null
    : categoryData;

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

      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <div className="w-full lg:w-[55%] lg:max-w-[600px]">
            <ProductGallery images={allImages} name={product.name_uk} />
          </div>

          <div className="w-full lg:w-[45%]">
            <div className="lg:sticky lg:top-[80px]">
              <ProductInfo
                productId={product.id}
                slug={product.slug}
                name={product.name_uk}
                sku={product.sku}
                price={product.price}
                oldPrice={product.old_price}
                quantity={product.quantity}
                status={product.status}
                brand={brand}
                properties={properties}
                description={product.description_uk}
                image={product.main_image_url}
              />
            </div>
          </div>
        </div>

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
