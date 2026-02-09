"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

interface Product {
  id: string;
  slug: string;
  name_uk: string;
  price: number;
  old_price: number | null;
  main_image_url: string | null;
}

interface PopularProductsProps {
  title: string;
  subtitle?: string;
  products: Product[];
  linkHref?: string;
  linkText?: string;
}

function fmtPrice(v: number) {
  return v.toLocaleString("uk-UA");
}

export function PopularProducts({
  title,
  subtitle,
  products,
  linkHref,
  linkText,
}: PopularProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 280;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mt-8">
      {/* Section header */}
      <div className="flex items-end justify-between px-4 md:px-6">
        <div>
          <h2 className="font-unbounded text-lg font-bold text-dark md:text-xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--t2)]">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {linkHref && linkText && (
            <Link
              href={linkHref}
              className="hidden text-sm font-medium text-coral transition-colors hover:text-coral-2 md:block"
            >
              {linkText}
            </Link>
          )}
          <div className="hidden gap-1 md:flex">
            <button
              onClick={() => scroll("left")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--t2)] transition-colors hover:border-dark hover:text-dark"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--t2)] transition-colors hover:border-dark hover:text-dark"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal scroll cards */}
      <div
        ref={scrollRef}
        className="scrollbar-none mt-4 flex gap-3 overflow-x-auto px-4 pb-2 md:px-6"
      >
        {products.map((p) => {
          const hasDiscount = p.old_price && p.old_price > p.price;
          const discountPct = hasDiscount
            ? Math.round(((p.old_price! - p.price) / p.old_price!) * 100)
            : 0;

          return (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="w-[156px] shrink-0 overflow-hidden rounded-card border border-[var(--border)] bg-white transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-[180px]"
            >
              {/* Image */}
              <div className="relative h-[156px] bg-sand sm:h-[180px]">
                {p.main_image_url ? (
                  <Image
                    src={p.main_image_url}
                    alt={p.name_uk}
                    fill
                    sizes="180px"
                    className="object-contain p-3"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--t3)]">
                    <Package size={28} strokeWidth={1} />
                  </div>
                )}
                {hasDiscount && (
                  <span className="font-unbounded absolute left-1.5 top-1.5 rounded-md bg-coral px-1.5 py-0.5 text-[9px] font-bold text-white">
                    -{discountPct}%
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-2.5">
                <p className="line-clamp-2 min-h-[2.2rem] text-xs leading-snug text-dark">
                  {p.name_uk}
                </p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span
                    className={`font-price text-sm font-bold ${
                      hasDiscount ? "text-coral" : "text-dark"
                    }`}
                  >
                    {fmtPrice(p.price)} ₴
                  </span>
                  {hasDiscount && (
                    <span className="font-price text-[11px] text-[var(--t3)] line-through">
                      {fmtPrice(p.old_price!)} ₴
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
