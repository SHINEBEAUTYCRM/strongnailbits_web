import Link from "next/link";
import Image from "next/image";
import { Grid3X3 } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { localizedName, type Lang } from "@/lib/language";

interface CategoryItem {
  id: string;
  name_uk: string;
  name_ru?: string | null;
  slug: string;
  image_url: string | null;
  product_count: number;
}

interface CategoriesProps {
  categories: CategoryItem[];
  lang: Lang;
}

export function Categories({ categories, lang }: CategoriesProps) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1280px] px-6">
      <SectionHeader
        label="КАТАЛОГ"
        title="Категорії"
        linkText="Всі категорії →"
        linkHref="/catalog"
      />

      <div className="grid grid-cols-4 gap-3 sm:gap-4 lg:grid-cols-8">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalog/${cat.slug}`}
            className="group flex flex-col items-center gap-2 rounded-card border border-[var(--border)] bg-white p-3 text-center transition-all duration-[400ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-coral hover:shadow-[0_8px_32px_rgba(0,0,0,.08)]"
          >
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[12px] bg-sand sm:h-16 sm:w-16">
              {cat.image_url ? (
                <Image
                  src={cat.image_url}
                  alt={localizedName(cat, lang)}
                  fill
                  sizes="64px"
                  className="object-contain p-1.5"
                />
              ) : (
                <Grid3X3 size={24} className="text-[var(--t3)]" />
              )}
            </div>
            <span className="font-unbounded line-clamp-2 text-[11px] font-bold leading-snug text-dark group-hover:text-coral">
              {localizedName(cat, lang)}
            </span>
            <span className="text-[11px] text-[var(--t3)]">
              {cat.product_count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
