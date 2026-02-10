"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { useCategoryTree, type CatNode } from "@/hooks/useCategoryTree";
import { useLanguage, localizedName } from "@/hooks/useLanguage";

export function CategoryNav() {
  const tree = useCategoryTree();
  const { lang } = useLanguage();
  const [hoverCatId, setHoverCatId] = useState<number | null>(null);

  const hoveredCat = hoverCatId
    ? tree.find((c) => c.cs_cart_id === hoverCatId) ?? null
    : null;

  const clearHover = useCallback(() => setHoverCatId(null), []);

  return (
    <div
      className="sticky top-[56px] z-40 md:top-[64px]"
      onMouseLeave={clearHover}
    >
      {/* Dark nav bar */}
      <div className="bg-[#1a1a1a]">
        <div className="scrollbar-none mx-auto flex max-w-[1280px] items-center overflow-x-auto whitespace-nowrap px-4 md:px-6">
          {/* Sale */}
          <Link
            href="/catalog?in_stock=true&sort=discount"
            className="shrink-0 px-3 py-3 text-sm font-semibold text-coral transition-colors hover:text-coral-2"
          >
            Sale
          </Link>

          {/* Бренди */}
          <Link
            href="/brands"
            className="shrink-0 px-3 py-3 text-sm text-white/70 transition-colors hover:text-white"
          >
            Бренди
          </Link>

          {/* Categories from tree */}
          {tree.map((cat) => (
            <div
              key={cat.id}
              className="relative"
              onMouseEnter={() =>
                cat.children.length > 0
                  ? setHoverCatId(cat.cs_cart_id)
                  : setHoverCatId(null)
              }
            >
              <Link
                href={`/catalog/${cat.slug}`}
                className={`flex shrink-0 items-center gap-1 px-3 py-3 text-sm transition-colors ${
                  hoverCatId === cat.cs_cart_id
                    ? "text-white"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {localizedName(cat, lang)}
                {cat.children.length > 0 && (
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${
                      hoverCatId === cat.cs_cart_id ? "rotate-180" : ""
                    }`}
                  />
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── Desktop mega-menu dropdown ── */}
      {hoveredCat && hoveredCat.children.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 hidden border-t border-[var(--border)] bg-white shadow-[0_16px_48px_rgba(0,0,0,.12)] md:block"
          onMouseEnter={() => setHoverCatId(hoveredCat.cs_cart_id)}
          onMouseLeave={clearHover}
        >
          <div className="mx-auto max-w-[1280px] px-6 py-6">
            {/* Category title */}
            <div className="mb-4 flex items-center justify-between">
              <Link
                href={`/catalog/${hoveredCat.slug}`}
                className="font-unbounded text-base font-bold text-dark hover:text-coral"
              >
                {localizedName(hoveredCat, lang)}
              </Link>
              <Link
                href={`/catalog/${hoveredCat.slug}`}
                className="text-xs font-medium text-coral hover:text-coral-2"
              >
                Дивитись все →
              </Link>
            </div>

            {/* Subcategories grid */}
            <div className="grid grid-cols-3 gap-x-8 gap-y-5 lg:grid-cols-4">
              {hoveredCat.children.map((child) => (
                <div key={child.id}>
                  <Link
                    href={`/catalog/${child.slug}`}
                    className="text-sm font-semibold text-dark transition-colors hover:text-coral"
                  >
                    {localizedName(child, lang)}
                  </Link>

                  {child.children.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-0.5">
                      {child.children.slice(0, 6).map((gc) => (
                        <li key={gc.id}>
                          <Link
                            href={`/catalog/${gc.slug}`}
                            className="text-[13px] text-[var(--t2)] transition-colors hover:text-coral"
                          >
                            {localizedName(gc, lang)}
                          </Link>
                        </li>
                      ))}
                      {child.children.length > 6 && (
                        <li>
                          <Link
                            href={`/catalog/${child.slug}`}
                            className="text-[13px] font-medium text-coral"
                          >
                            Ще {child.children.length - 6}...
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
