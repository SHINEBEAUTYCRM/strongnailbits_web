"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { localizedName, type Lang } from "@/hooks/useLanguage";

interface Product {
  id: string;
  slug: string;
  name_uk: string;
  name_ru?: string | null;
  price: number;
  old_price: number | null;
  main_image_url: string | null;
  status?: string;
  quantity?: number;
  is_new?: boolean;
  is_featured?: boolean;
  brands?: { name: string } | { name: string }[] | null;
}

interface Props {
  title: string;
  products: Product[];
  lang: Lang;
  linkHref?: string;
  linkText?: string;
  /** Number of product images to preload eagerly (above the fold) */
  priorityCount?: number;
}

export function ProductSection({
  title,
  products,
  lang,
  linkHref,
  linkText,
  priorityCount = 0,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  return (
    <section className="mt-10">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="font-unbounded text-lg font-bold text-[#1a1a1a] sm:text-xl">
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {linkHref && linkText && (
            <Link
              href={linkHref}
              className="hidden text-sm font-medium text-coral transition-colors hover:text-[#B8203F] md:block"
            >
              {linkText}
            </Link>
          )}
          <div className="hidden gap-1 md:flex">
            <button
              onClick={() => scroll("left")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e8e8] text-[#6b6b7b] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
              aria-label="Назад"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e8e8] text-[#6b6b7b] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
              aria-label="Вперед"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        className="scrollbar-none -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 md:-mx-0 md:gap-4 md:px-0"
      >
        {products.map((p, idx) => {
          const brandData = p.brands;
          const brandName = Array.isArray(brandData)
            ? brandData[0]?.name
            : brandData?.name;

          return (
            <div
              key={p.id}
              className="w-[170px] shrink-0 sm:w-[195px] lg:w-[210px]"
            >
              <ProductCard
                id={p.id}
                slug={p.slug}
                name={localizedName(p, lang)}
                price={p.price}
                oldPrice={p.old_price}
                imageUrl={p.main_image_url}
                brand={brandName ?? null}
                isNew={p.is_new}
                isFeatured={p.is_featured}
                status={p.status ?? "active"}
                quantity={p.quantity ?? 0}
                priority={idx < priorityCount}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile "view all" link */}
      {linkHref && linkText && (
        <div className="mt-3 text-center md:hidden">
          <Link
            href={linkHref}
            className="text-sm font-medium text-coral"
          >
            {linkText}
          </Link>
        </div>
      )}
    </section>
  );
}
