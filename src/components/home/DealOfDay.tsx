"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { showToast } from "@/components/ui/Toast";
import { useLanguage, localizedName } from "@/hooks/useLanguage";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DealProduct {
  id: string;
  slug: string;
  name_uk: string;
  name_ru?: string | null;
  price: number;
  old_price: number;
  main_image_url: string | null;
  brand_name: string | null;
}

interface DealOfDayProps {
  product: DealProduct | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function useCountdown() {
  const [remaining, setRemaining] = useState(getTimeRemaining());

  function getTimeRemaining() {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const diff = endOfDay.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { hours, minutes, seconds };
  }

  useEffect(() => {
    const t = setInterval(() => setRemaining(getTimeRemaining()), 1000);
    return () => clearInterval(t);
  }, []);

  return remaining;
}

export function DealOfDay({ product }: DealOfDayProps) {
  const { hours, minutes, seconds } = useCountdown();
  const { lang } = useLanguage();
  const addItem = useCartStore((s) => s.addItem);

  if (!product) return null;

  const discount = Math.round(
    ((product.old_price - product.price) / product.old_price) * 100,
  );

  function handleAdd() {
    addItem({
      product_id: product!.id,
      name: localizedName(product!, lang),
      slug: product!.slug,
      image: product!.main_image_url,
      price: product!.price,
      old_price: product!.old_price,
      quantity: 1,
      sku: null,
      max_quantity: 999,
      weight: null,
    });
    showToast("Товар додано в кошик");
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
      {/* Label */}
      <div className="flex items-center justify-between bg-gradient-to-r from-red-500/10 to-pink-500/10 px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-red-400">
          Товар дня
        </span>
        <span className="font-price text-xs font-semibold text-zinc-400">
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
      </div>

      {/* Product */}
      <Link href={`/product/${product.slug}`} className="group flex flex-col p-4">
        {/* Image */}
        <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-zinc-950">
          {product.main_image_url ? (
            <Image
              src={product.main_image_url}
              alt={localizedName(product, lang)}
              fill
              sizes="300px"
              className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-800">
              <ShoppingBag size={48} strokeWidth={1} />
            </div>
          )}

          {/* Discount badge */}
          <span className="absolute left-2 top-2 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            &minus;{discount}%
          </span>
        </div>

        {/* Info */}
        {product.brand_name && (
          <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-purple-400">
            {product.brand_name}
          </span>
        )}
        <h3 className="mb-3 line-clamp-2 text-sm font-medium text-zinc-300 group-hover:text-white">
          {localizedName(product, lang)}
        </h3>

        {/* Price */}
        <div className="mb-4 flex items-baseline gap-2">
          <span className="gradient-text font-price text-2xl font-bold">
            {product.price.toLocaleString("uk-UA")} ₴
          </span>
          <span className="font-price text-sm text-zinc-500 line-through">
            {product.old_price.toLocaleString("uk-UA")} ₴
          </span>
        </div>
      </Link>

      {/* Buy button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleAdd}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-purple-500/20"
        >
          <ShoppingBag size={16} />
          Купити
        </button>
      </div>
    </div>
  );
}
