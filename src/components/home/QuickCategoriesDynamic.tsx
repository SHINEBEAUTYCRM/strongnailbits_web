import Link from "next/link";
import type { Lang } from "@/lib/language";

interface QuickCatItem {
  id: string;
  title_override_uk: string | null;
  title_override_ru: string | null;
  image_override: string | null;
  categories: {
    id: string;
    name_uk: string;
    name_ru: string | null;
    slug: string;
    image_url: string | null;
  } | null;
}

interface Props {
  items: QuickCatItem[];
  lang: Lang;
}

export function QuickCategoriesDynamic({ items, lang }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const cat = item.categories;
        if (!cat) return null;
        const name = item.title_override_uk
          ? lang === "ru"
            ? item.title_override_ru || item.title_override_uk
            : item.title_override_uk
          : lang === "ru"
            ? cat.name_ru || cat.name_uk
            : cat.name_uk;

        return (
          <Link
            key={item.id}
            href={`/catalog/${cat.slug}`}
            className="shrink-0 rounded-full border border-[#e8e8e8] bg-white px-4 py-2 text-[13px] font-medium text-[#1a1a1a] transition-all hover:border-coral hover:text-coral"
          >
            {name}
          </Link>
        );
      })}
      <Link
        href="/catalog"
        className="shrink-0 rounded-full bg-[#f5f5f5] px-4 py-2 text-[13px] font-medium text-[#6b6b7b] transition-colors hover:bg-[#eee]"
      >
        Всі категорії →
      </Link>
    </div>
  );
}
