import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = [
    { label: "Головна", href: "/" },
    { label: "Каталог", href: "/catalog" },
    ...items,
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems
      .filter((item) => item.href)
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        item: `${process.env.NEXT_PUBLIC_SITE_URL || ""}${item.href}`,
      })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumbs" className="mb-6 overflow-x-auto">
        <ol className="flex items-center gap-1 whitespace-nowrap text-sm">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;
            return (
              <li key={item.href ?? index} className="flex items-center gap-1">
                {index === 0 && item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 text-[var(--t3)] transition-colors hover:text-[var(--t2)]"
                  >
                    <Home size={13} />
                  </Link>
                ) : isLast || !item.href ? (
                  <span className="font-medium text-dark">{item.label}</span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-[var(--t3)] transition-colors hover:text-[var(--t2)]"
                  >
                    {item.label}
                  </Link>
                )}
                {!isLast && (
                  <ChevronRight size={12} className="text-[var(--t3)]" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
