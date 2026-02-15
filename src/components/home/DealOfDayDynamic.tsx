"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { Clock } from "lucide-react";
import { localizedName, type Lang } from "@/hooks/useLanguage";

interface DealProps {
  deal: {
    id: string;
    title_uk: string;
    title_ru: string | null;
    subtitle_uk: string | null;
    subtitle_ru: string | null;
    end_at: string;
    cta_text_uk: string | null;
    cta_url: string | null;
    bg_color: string | null;
  };
  products: {
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
  }[];
  lang: Lang;
}

function calcRemaining(end: string) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function useCountdown(endAt: string) {
  const [remaining, setRemaining] = useState(calcRemaining(endAt));

  useEffect(() => {
    const t = setInterval(() => {
      const r = calcRemaining(endAt);
      setRemaining(r);
      if (!r) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [endAt]);

  return remaining;
}

export function DealOfDayDynamic({ deal, products, lang }: DealProps) {
  const countdown = useCountdown(deal.end_at);

  if (!countdown) return null;

  const title = lang === "ru" ? (deal.title_ru || deal.title_uk) : deal.title_uk;
  const subtitle = lang === "ru" ? (deal.subtitle_ru || deal.subtitle_uk) : deal.subtitle_uk;

  return (
    <section
      style={{ backgroundColor: deal.bg_color || "#FFF5F6" }}
      className="rounded-2xl p-6 md:p-8"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-unbounded text-xl font-black text-[#1a1a1a] md:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-[#6b6b7b]">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-coral" />
          <div className="flex items-center gap-1 font-mono text-lg font-bold text-[#1a1a1a]">
            <span className="rounded-lg bg-white px-2 py-1">
              {String(countdown.hours).padStart(2, "0")}
            </span>
            <span>:</span>
            <span className="rounded-lg bg-white px-2 py-1">
              {String(countdown.minutes).padStart(2, "0")}
            </span>
            <span>:</span>
            <span className="rounded-lg bg-white px-2 py-1">
              {String(countdown.seconds).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {products.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.slice(0, 5).map((p) => {
            const brandData = p.brands;
            const brandName = Array.isArray(brandData)
              ? brandData[0]?.name
              : brandData?.name;

            return (
              <ProductCard
                key={p.id}
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
              />
            );
          })}
        </div>
      )}

      {deal.cta_url && (
        <div className="mt-6 text-center">
          <Link
            href={deal.cta_url}
            className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c41e3a]"
          >
            {deal.cta_text_uk || "Всі акції"} →
          </Link>
        </div>
      )}
    </section>
  );
}
