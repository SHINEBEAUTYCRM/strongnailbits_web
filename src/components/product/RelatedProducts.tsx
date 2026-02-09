import { createAdminClient } from "@/lib/supabase/admin";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface RelatedProductsProps {
  categoryId: string;
  excludeProductId: string;
}

export async function RelatedProducts({
  categoryId,
  excludeProductId,
}: RelatedProductsProps) {
  const supabase = createAdminClient();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, slug, name_uk, price, old_price, main_image_url, status, is_new, quantity, brands(name)",
    )
    .eq("category_id", categoryId)
    .eq("status", "active")
    .neq("id", excludeProductId)
    .order("position", { ascending: true })
    .limit(8);

  if (!products || products.length === 0) return null;

  return (
    <section className="mt-16">
      <SectionHeader title="Схожі товари" />
      <ProductGrid>
        {products.map((product) => {
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
              status={product.status}
              quantity={product.quantity}
            />
          );
        })}
      </ProductGrid>
    </section>
  );
}
