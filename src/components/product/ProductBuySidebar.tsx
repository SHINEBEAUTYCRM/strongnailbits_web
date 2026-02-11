"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Check,
  Zap,
  Plus,
  Minus,
  Truck,
  Package,
  Shield,
  RotateCcw,
  MapPin,
  CreditCard,
  Heart,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { showToast } from "@/components/ui/Toast";
import { formatPrice } from "@/utils/format";
import { trackAddToCart } from "@/lib/analytics/tracker";

interface Props {
  productId: string;
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  quantity: number;
  status: string;
  sku: string | null;
  image: string | null;
  brand: string | null;
  isB2bPrice?: boolean;
}

export function ProductBuySidebar({
  productId,
  slug,
  name,
  price,
  oldPrice,
  quantity,
  status,
  sku,
  image,
  brand,
  isB2bPrice,
}: Props) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const inCart = cartItems.find((i) => i.product_id === productId);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.hasItem(productId));

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAvailable = status === "active" && quantity > 0;
  const isLow = isAvailable && quantity > 0 && quantity < 5;
  const maxQty = quantity || 0;
  const discount =
    oldPrice && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;
  const savings = oldPrice && oldPrice > price ? oldPrice - price : 0;

  function handleAdd() {
    addItem({
      product_id: productId,
      name,
      slug,
      image,
      price,
      old_price: oldPrice,
      quantity: qty,
      sku,
      max_quantity: maxQty,
      weight: null,
    });
    trackAddToCart({
      item_id: productId,
      item_name: name,
      item_brand: brand || undefined,
      price,
      quantity: qty,
      discount: oldPrice && oldPrice > price ? oldPrice - price : 0,
    });
    showToast("Додано в кошик");
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleWishlist() {
    toggleWishlist({
      id: productId,
      slug,
      name,
      price,
      oldPrice,
      imageUrl: image,
      brand,
    });
    showToast(isInWishlist ? "Видалено з обраного" : "Додано в обране");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Price block ── */}
      <div className="rounded-xl border border-[#f0f0f0] bg-white p-5">
        {/* Price */}
        <div className="flex items-end gap-3">
          <span
            className={`font-price text-[28px] font-bold leading-none ${
              discount > 0 ? "text-[#ff3b30]" : "text-[#222]"
            }`}
          >
            {formatPrice(price)}
          </span>
          {oldPrice && oldPrice > price && (
            <span className="font-price mb-0.5 text-[16px] text-[#bbb] line-through">
              {formatPrice(oldPrice)}
            </span>
          )}
        </div>

        {/* B2B badge */}
        {isB2bPrice && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#7c3aed]/10 px-2.5 py-1">
            <span className="text-[11px] font-bold text-[#7c3aed]">B2B ціна</span>
          </div>
        )}

        {/* Discount info */}
        {discount > 0 && savings > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-md bg-[#ff3b30] px-2 py-0.5 text-[11px] font-bold text-white">
              &minus;{discount}%
            </span>
            <span className="text-[12px] font-medium text-[#008040]">
              Вигода {formatPrice(savings)}
            </span>
          </div>
        )}

        {/* Availability */}
        <div className="mt-3 flex items-center gap-2 text-[13px]">
          {isLow ? (
            <>
              <div className="h-2 w-2 rounded-full bg-[#ff9500]" />
              <span className="text-[#ff9500]">
                Закінчується — залишилось {quantity} шт
              </span>
            </>
          ) : isAvailable ? (
            <>
              <div className="h-2 w-2 rounded-full bg-[#008040]" />
              <span className="text-[#008040]">В наявності</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-[#ff3b30]" />
              <span className="text-[#ff3b30]">Немає в наявності</span>
            </>
          )}
        </div>

        {/* Quantity picker */}
        {isAvailable && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 items-center rounded-lg border border-[#eee]">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex h-full w-10 items-center justify-center text-[#999] hover:text-[#222]"
              >
                <Minus size={14} />
              </button>
              <span className="font-price w-8 text-center text-[14px] font-semibold text-[#222]">
                {qty}
              </span>
              <button
                onClick={() => setQty(Math.min(qty + 1, maxQty || 999))}
                disabled={qty >= maxQty && maxQty > 0}
                className="flex h-full w-10 items-center justify-center text-[#999] hover:text-[#222] disabled:opacity-30"
              >
                <Plus size={14} />
              </button>
            </div>
            {mounted && inCart && (
              <span className="text-[12px] text-[#999]">
                В кошику: {inCart.quantity} шт
              </span>
            )}
          </div>
        )}

        {/* Buy button — GREEN */}
        <button
          onClick={handleAdd}
          disabled={!isAvailable}
          className={`mt-4 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl text-[15px] font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
            added
              ? "bg-[#008040]"
              : "bg-[#008040] shadow-[0_4px_16px_rgba(0,128,64,0.3)] hover:bg-[#006B35] active:scale-[0.98]"
          }`}
        >
          {added ? (
            <>
              <Check size={18} />
              Додано в кошик
            </>
          ) : (
            <>
              <ShoppingBag size={18} />
              Купити
            </>
          )}
        </button>

        {/* Secondary actions row */}
        <div className="mt-2 flex gap-2">
          <button
            disabled={!isAvailable}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#eee] text-[13px] font-medium text-[#666] transition-colors hover:border-[#222] hover:text-[#222] disabled:opacity-40"
          >
            <Zap size={14} />
            Купити в 1 клік
          </button>
          <button
            onClick={handleWishlist}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              mounted && isInWishlist
                ? "border-[#ff3b30] bg-[#ff3b30] text-white"
                : "border-[#eee] text-[#999] hover:border-[#ff3b30] hover:text-[#ff3b30]"
            }`}
            aria-label="Обране"
          >
            <Heart
              size={16}
              fill={mounted && isInWishlist ? "currentColor" : "none"}
            />
          </button>
        </div>

        {/* Payment methods */}
        <div className="mt-4 border-t border-[#f0f0f0] pt-3">
          <p className="mb-2 text-[11px] text-[#999]">
            Оплатіть зручним способом
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Visa", bg: "#1a1f71", color: "#fff" },
              { label: "MC", bg: "#eb001b", color: "#fff" },
              { label: "Apple Pay", bg: "#000", color: "#fff" },
              { label: "Google Pay", bg: "#fff", color: "#333" },
              { label: "Накладений платіж", bg: "#f5f5f7", color: "#666" },
            ].map((m) => (
              <span
                key={m.label}
                className="rounded-md border border-[#e8e8e8] px-2 py-1 text-[10px] font-semibold"
                style={{ background: m.bg, color: m.color }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Delivery ── */}
      <div className="rounded-xl border border-[#f0f0f0] bg-white p-5">
        <h3 className="mb-3 text-[14px] font-bold text-[#222]">Доставка</h3>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-start gap-3">
            <Truck size={16} className="mt-0.5 shrink-0 text-[#008040]" />
            <div>
              <p className="text-[13px] font-medium text-[#222]">
                Нова Пошта
              </p>
              <p className="text-[12px] text-[#999]">
                1-3 дні • від 70 ₴
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Truck size={16} className="mt-0.5 shrink-0 text-[#007aff]" />
            <div>
              <p className="text-[13px] font-medium text-[#222]">
                Нова Пошта — кур&apos;єр
              </p>
              <p className="text-[12px] text-[#999]">
                1-3 дні • до дверей
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin size={16} className="mt-0.5 shrink-0 text-[#ff9500]" />
            <div>
              <p className="text-[13px] font-medium text-[#222]">
                Укрпошта
              </p>
              <p className="text-[12px] text-[#999]">
                3-7 днів • від 35 ₴
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-[#f0faf0] px-3 py-2">
            <Package size={16} className="mt-0.5 shrink-0 text-[#008040]" />
            <p className="text-[12px] font-medium text-[#008040]">
              Безкоштовно від 3 000 ₴
            </p>
          </div>
        </div>
      </div>

      {/* ── Guarantees ── */}
      <div className="rounded-xl border border-[#f0f0f0] bg-white p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Shield size={16} className="mt-0.5 shrink-0 text-[#008040]" />
            <p className="text-[13px] text-[#444]">
              100% оригінальна продукція з сертифікатами від виробника
            </p>
          </div>
          <div className="flex items-start gap-3">
            <RotateCcw size={16} className="mt-0.5 shrink-0 text-[#007aff]" />
            <p className="text-[13px] text-[#444]">
              Повернення протягом 14 днів
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CreditCard size={16} className="mt-0.5 shrink-0 text-[#ff9500]" />
            <p className="text-[13px] text-[#444]">
              Безпечна оплата онлайн або при отриманні
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
