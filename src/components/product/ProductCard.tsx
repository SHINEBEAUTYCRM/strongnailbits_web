"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Check, Package } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { showToast } from "@/components/ui/Toast";
import { trackAddToCart } from "@/lib/analytics/tracker";

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string | null;
  brand?: string | null;
  isNew?: boolean;
  isFeatured?: boolean;
  status?: string;
  quantity?: number;
  /** Mark as priority for above-the-fold images (skips lazy loading, preloads) */
  priority?: boolean;
}

function fmtPrice(v: number) {
  return v.toLocaleString("uk-UA");
}

export function ProductCard({
  id,
  slug,
  name,
  price,
  oldPrice,
  imageUrl,
  brand,
  isNew,
  isFeatured,
  status = "active",
  quantity = 0,
  priority = false,
}: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.hasItem(id));
  const isAvailable = status === "active" && quantity > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasDiscount = oldPrice && oldPrice > price;
  const discountPct = hasDiscount
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : 0;
  const savings = hasDiscount ? Math.round(oldPrice - price) : 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAvailable) return;
    addItem({
      product_id: id,
      name,
      slug,
      image: imageUrl ?? null,
      price,
      old_price: oldPrice ?? null,
      quantity: 1,
      sku: null,
      max_quantity: quantity,
      weight: null,
    });
    trackAddToCart({
      item_id: id,
      item_name: name,
      item_brand: brand || undefined,
      price,
      quantity: 1,
      discount: oldPrice && oldPrice > price ? oldPrice - price : 0,
    });
    showToast("Товар додано в кошик");
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <Link
      href={`/product/${slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)]"
    >
      {/* ── Image area ── */}
      <div className="relative aspect-square overflow-hidden bg-[#f5f5f7]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#c4c4cc]">
            <Package size={36} strokeWidth={1} />
          </div>
        )}

        {/* Out of stock */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75">
            <span className="rounded-full bg-[#999] px-3 py-1 text-[11px] font-semibold text-white">
              Немає в наявності
            </span>
          </div>
        )}

        {/* ── Badges top-left ── */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
          {hasDiscount && (
            <span className="rounded-lg bg-coral px-2.5 py-1 text-[11px] font-bold leading-none text-white">
              -{discountPct}%
            </span>
          )}
          {hasDiscount && savings >= 50 && (
            <span className="rounded-lg bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-bold leading-none text-white">
              Вигода {fmtPrice(savings)}&thinsp;₴
            </span>
          )}
          {isNew && (
            <span className="rounded-lg bg-green px-2.5 py-1 text-[11px] font-bold leading-none text-white">
              NEW
            </span>
          )}
          {isFeatured && !isNew && !hasDiscount && (
            <span className="rounded-lg bg-amber px-2.5 py-1 text-[11px] font-bold leading-none text-white">
              HIT
            </span>
          )}
        </div>

        {/* ── Wishlist heart — always visible ── */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist({
              id,
              slug,
              name,
              price,
              oldPrice: oldPrice ?? null,
              imageUrl: imageUrl ?? null,
              brand: brand ?? null,
            });
            showToast(
              isInWishlist ? "Видалено з обраного" : "Додано в обране",
            );
          }}
          className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
            mounted && isInWishlist
              ? "bg-coral text-white shadow-md"
              : "bg-white text-[#6e6e7a] shadow-sm hover:text-coral"
          }`}
          aria-label={
            isInWishlist ? "Видалити з обраного" : "Додати в обране"
          }
        >
          <Heart
            size={15}
            fill={mounted && isInWishlist ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* ── Info area ── */}
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        {/* Brand */}
        {brand && (
          <span className="mb-1 w-fit rounded bg-coral/[0.04] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coral">
            {brand}
          </span>
        )}

        {/* Name */}
        <h3 className="line-clamp-2 min-h-[2.4rem] text-[13px] leading-snug text-[#1a1a1a] transition-colors duration-200 group-hover:text-coral">
          {name}
        </h3>

        {/* Stock */}
        {isAvailable && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-green">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />В наявності
          </div>
        )}

        {/* ── Price + Cart ── */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            {hasDiscount && (
              <span className="font-price block text-[12px] leading-none text-[#6e6e7a] line-through">
                {fmtPrice(oldPrice)}&thinsp;₴
              </span>
            )}
            <span
              className={`font-price text-[17px] font-bold leading-tight ${
                hasDiscount ? "text-coral" : "text-[#1a1a1a]"
              }`}
            >
              {fmtPrice(price)}&thinsp;₴
            </span>
          </div>

          {/* Add to cart button */}
          {isAvailable && (
            <button
              onClick={handleAdd}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                added
                  ? "bg-green text-white"
                  : "bg-coral text-white shadow-sm hover:shadow-md active:scale-95"
              }`}
              aria-label="Купити"
            >
              {added ? <Check size={16} /> : <ShoppingCart size={16} />}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
