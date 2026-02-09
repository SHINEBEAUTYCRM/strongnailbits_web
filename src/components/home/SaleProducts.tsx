import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGrid } from "@/components/product/ProductGrid";

interface SaleProduct {
  id: string;
  slug: string;
  name_uk: string;
  price: number;
  old_price: number | null;
  main_image_url: string | null;
  quantity: number;
  is_new: boolean;
  sku: string | null;
  status: string;
  brands: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

interface SaleProductsProps {
  products: SaleProduct[];
}

export function SaleProducts({ products }: SaleProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1280px] px-6">
      <SectionHeader
        label="SALE"
        labelColor="var(--coral)"
        title="Зі знижкою"
        linkText="Всі акції →"
        linkHref="/catalog?in_stock=true&sort=discount"
      />

      <ProductGrid>
        {products.map((p) => {
          const brandData = p.brands;
          const brandName = Array.isArray(brandData)
            ? brandData[0]?.name
            : brandData?.name;
          return (
            <ProductCard
              key={p.id}
              id={p.id}
              slug={p.slug}
              name={p.name_uk}
              price={p.price}
              oldPrice={p.old_price}
              imageUrl={p.main_image_url}
              brand={brandName ?? null}
              isNew={p.is_new}
              status={p.status}
              quantity={p.quantity}
            />
          );
        })}
      </ProductGrid>
    </section>
  );
}
