import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CategoryNode } from "@/lib/categories/tree";
import { localizedName, type Lang } from "@/lib/language";

interface Props {
  categories: CategoryNode[];
  lang: Lang;
}

export function HomeSidebar({ categories, lang }: Props) {
  return (
    <aside className="hidden w-[240px] shrink-0 lg:block">
      <div className="sticky top-[80px] overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {/* Sale */}
        <Link
          href="/catalog?in_stock=true&sort=discount"
          className="flex items-center gap-2.5 border-b border-[#f0f0f0] px-4 py-3.5 transition-colors hover:bg-[#fff5f6]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral text-[11px] font-extrabold text-white">
            %
          </span>
          <span className="text-[14px] font-semibold text-coral">Sale</span>
        </Link>

        {/* Brands */}
        <Link
          href="/brands"
          className="flex items-center border-b border-[#f0f0f0] px-4 py-3.5 text-[14px] font-medium text-[#1a1a1a] transition-colors hover:bg-[#f8f8f8]"
        >
          Бренди
        </Link>

        {/* Categories */}
        {categories.map((cat, i) => (
          <Link
            key={cat.id}
            href={`/catalog/${cat.slug}`}
            className={`flex items-center justify-between px-4 py-3.5 text-[14px] text-[#1a1a1a] transition-colors hover:bg-[#f8f8f8] hover:text-coral ${
              i < categories.length - 1 ? "border-b border-[#f0f0f0]" : ""
            }`}
          >
            <span className="line-clamp-1">{localizedName(cat, lang)}</span>
            {cat.children.length > 0 && (
              <ChevronRight size={14} className="shrink-0 text-[#c4c4cc]" />
            )}
          </Link>
        ))}
      </div>
    </aside>
  );
}
