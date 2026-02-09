import Link from "next/link";
import type { CategoryNode } from "@/lib/categories/tree";

interface Props {
  categories: CategoryNode[];
}

/**
 * Horizontal scrollable category chips below the banner.
 * Shows first-level subcategories of the first root category + other root categories.
 */
export function QuickCategories({ categories }: Props) {
  /* Build chip list: subcategories of first root + remaining roots */
  const chips: { label: string; href: string }[] = [];

  if (categories.length > 0) {
    const first = categories[0];
    /* Add subcategories of the first root (e.g., "Ногти" → Гель-лаки, Бази, Топи...) */
    for (const child of first.children.slice(0, 6)) {
      chips.push({ label: child.name_uk, href: `/catalog/${child.slug}` });
    }
    /* Add remaining root categories */
    for (const cat of categories.slice(1)) {
      chips.push({ label: cat.name_uk, href: `/catalog/${cat.slug}` });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      {chips.map((chip) => (
        <Link
          key={chip.href}
          href={chip.href}
          className="shrink-0 rounded-full border border-[#e8e8e8] bg-white px-4 py-2 text-[13px] font-medium text-[#1a1a1a] transition-all hover:border-coral hover:text-coral"
        >
          {chip.label}
        </Link>
      ))}
    </div>
  );
}
