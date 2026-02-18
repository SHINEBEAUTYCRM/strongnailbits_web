import Link from "next/link";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface BrandsProps {
  brands: BrandItem[];
}

export function Brands({ brands }: BrandsProps) {
  if (brands.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1280px] px-6">
      <SectionHeader
        label="БРЕНДИ"
        title="Офіційний дистриб'ютор"
        linkText="Всі бренди →"
        linkHref="/brands"
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/catalog?brands=${brand.slug}`}
            className="flex flex-col items-center justify-center rounded-card border border-[var(--border)] bg-white p-4 py-6 text-center transition-all duration-[400ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] hover:border-coral/30 hover:shadow-[0_8px_32px_rgba(0,0,0,.06)]"
          >
            <span className="font-unbounded text-sm font-extrabold text-dark">
              {brand.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
