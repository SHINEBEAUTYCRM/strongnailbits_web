"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Zap, Plus, Minus, Package, ChevronDown, Check } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { showToast } from "@/components/ui/Toast";
import { formatPrice } from "@/utils/format";

interface ProductInfoProps {
  productId: string;
  slug: string;
  name: string;
  sku: string | null;
  price: number;
  oldPrice: number | null;
  quantity: number;
  status: string;
  brand: { name: string; slug: string } | null;
  properties: Record<string, string>;
  description: string | null;
  image: string | null;
}

export function ProductInfo({
  productId,
  slug,
  name,
  sku,
  price,
  oldPrice,
  quantity,
  status,
  brand,
  properties,
  description,
  image,
}: ProductInfoProps) {
  const [qty, setQty] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);
  const [added, setAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const inCart = cartItems.find((i) => i.product_id === productId);

  const isAvailable = status === "active" && quantity > 0;
  const isLow = isAvailable && quantity < 5;
  const maxQty = quantity || 0;
  const discount =
    oldPrice && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;

  const propertyEntries = Object.entries(properties);
  const descriptionLong = description && description.length > 400;

  function handleAddToCart() {
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
    showToast("Товар додано в кошик");
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Brand */}
      {brand && (
        <Link
          href={`/catalog?brands=${brand.slug}`}
          className="font-unbounded inline-flex w-fit text-[10px] font-bold uppercase tracking-[3px] text-coral transition-colors hover:text-coral-2"
        >
          {brand.name}
        </Link>
      )}

      {/* Name */}
      <h1 className="font-unbounded text-xl font-black leading-tight text-dark sm:text-2xl">
        {name}
      </h1>

      {/* SKU */}
      {sku && (
        <div className="text-sm text-[var(--t2)]">
          Артикул: <span className="font-price text-[var(--t)]">{sku}</span>
        </div>
      )}

      <div className="h-px bg-[var(--border)]" />

      {/* Price block */}
      <div className="flex items-end gap-3">
        <span
          className={`font-price text-3xl font-bold sm:text-4xl ${
            discount > 0 ? "text-coral" : "text-dark"
          }`}
        >
          {formatPrice(price)}
        </span>
        {oldPrice && oldPrice > price && (
          <span className="font-price mb-1 text-xl text-[var(--t3)] line-through">
            {formatPrice(oldPrice)}
          </span>
        )}
        {discount > 0 && (
          <span className="font-unbounded mb-1 rounded-[8px] bg-coral px-2.5 py-0.5 text-[9px] font-extrabold text-white">
            &minus;{discount}%
          </span>
        )}
      </div>

      {/* Availability */}
      <div className="flex items-center gap-2 text-sm">
        <Package size={15} className="text-[var(--t3)]" />
        {isLow ? (
          <span className="text-amber">Закінчується (залишилось {quantity})</span>
        ) : isAvailable ? (
          <span className="text-green">В наявності</span>
        ) : (
          <span className="text-red">Немає в наявності</span>
        )}
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* Quantity + Cart */}
      <div className="flex flex-col gap-3">
        <div className="flex h-12 w-fit items-center rounded-[10px] border border-[var(--border)] bg-white">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="flex h-full w-12 items-center justify-center text-[var(--t3)] transition-colors hover:text-dark"
            aria-label="Менше"
          >
            <Minus size={16} />
          </button>
          <span className="font-price w-10 text-center text-sm font-semibold text-dark">
            {qty}
          </span>
          <button
            onClick={() => setQty(Math.min(qty + 1, maxQty || 999))}
            disabled={qty >= maxQty && maxQty > 0}
            className="flex h-full w-12 items-center justify-center text-[var(--t3)] transition-colors hover:text-dark disabled:opacity-30"
            aria-label="Більше"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!isAvailable}
          className={`font-unbounded flex h-12 w-full items-center justify-center gap-2 rounded-pill text-[13px] font-bold text-white transition-all duration-300 disabled:opacity-40 disabled:shadow-none ${
            added
              ? "bg-green"
              : "bg-coral hover:bg-coral-2 hover:glow-coral"
          }`}
        >
          {added ? (
            <>
              <Check size={16} />
              Додано
              {inCart ? ` (${inCart.quantity} шт)` : ""}
            </>
          ) : (
            <>
              <ShoppingBag size={16} />
              {!isAvailable ? "Немає в наявності" : "Додати в кошик"}
            </>
          )}
        </button>

        <button
          disabled={!isAvailable}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-pill border border-[var(--border)] text-sm font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark disabled:opacity-40"
        >
          <Zap size={16} />
          Купити в 1 клік
        </button>
      </div>

      {/* Properties */}
      {propertyEntries.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <h3 className="font-unbounded mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
            Характеристики
          </h3>
          <div className="min-w-0 overflow-hidden rounded-card border border-[var(--border)]">
            {propertyEntries.map(([key, value], i) => (
              <div
                key={key}
                className={`flex gap-4 px-4 py-2.5 text-sm ${
                  i % 2 === 0 ? "bg-sand/50" : "bg-white"
                }`}
              >
                <span className="w-2/5 shrink-0 text-[var(--t2)]">{key}</span>
                <span className="min-w-0 break-words text-dark">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="mt-2">
          <h3 className="font-unbounded mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
            Опис
          </h3>
          <div
            className={`prose prose-sm max-w-none text-sm leading-relaxed text-[var(--t2)] ${
              !descExpanded && descriptionLong ? "line-clamp-6" : ""
            }`}
            dangerouslySetInnerHTML={{ __html: description }}
          />
          {descriptionLong && (
            <button
              onClick={() => setDescExpanded(!descExpanded)}
              className="mt-2 flex items-center gap-1 text-sm font-medium text-coral transition-colors hover:text-coral-2"
            >
              {descExpanded ? "Згорнути" : "Читати повністю"}
              <ChevronDown
                size={14}
                className={`transition-transform ${descExpanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
