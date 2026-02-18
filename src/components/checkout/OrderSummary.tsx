"use client";

import Image from "next/image";
import { Minus, Plus, Trash2, Package, Truck } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice } from "@/utils/format";

const FREE_SHIPPING_THRESHOLD = 3000;

interface OrderSummaryProps {
  isInternational: boolean;
  onSubmit: () => void;
  submitting: boolean;
  isValid: boolean;
}

export function OrderSummary({
  isInternational,
  onSubmit,
  submitting,
  isValid,
}: OrderSummaryProps) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = useCartStore((s) => s.getTotal());

  const totalWeight = items.reduce(
    (sum, item) => sum + (item.weight ?? 0) * item.quantity,
    0,
  );
  const hasWeight = totalWeight > 0;

  const remaining = FREE_SHIPPING_THRESHOLD - total;
  const freeShippingProgress = Math.min(
    (total / FREE_SHIPPING_THRESHOLD) * 100,
    100,
  );

  return (
    <div className="rounded-card border border-[var(--border)] bg-white p-5">
      <h3 className="font-unbounded mb-4 text-sm font-bold text-dark">
        Ваше замовлення
      </h3>

      <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto">
        {items.map((item) => (
          <div key={item.product_id} className="flex gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border border-[var(--border)] bg-sand">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="48px"
                  className="object-contain p-0.5"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--t3)]">
                  <Package size={16} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-xs text-dark">{item.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    className="flex h-5 w-5 items-center justify-center rounded text-[var(--t3)] hover:bg-sand hover:text-dark"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="font-price w-5 text-center text-[11px] font-medium text-dark">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    disabled={item.quantity >= item.max_quantity}
                    className="flex h-5 w-5 items-center justify-center rounded text-[var(--t3)] hover:bg-sand hover:text-dark disabled:opacity-30"
                  >
                    <Plus size={10} />
                  </button>
                </div>
                <span className="text-xs text-[var(--t3)]">×</span>
                <span className="font-price text-xs font-medium text-dark">
                  {formatPrice(item.price)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-price text-xs font-bold text-dark">
                {formatPrice(item.price * item.quantity)}
              </span>
              <button
                onClick={() => removeItem(item.product_id)}
                className="text-[var(--t3)] transition-colors hover:text-red"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="my-4 h-px bg-[var(--border)]" />

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--t2)]">Товари ({items.length})</span>
          <span className="font-price font-medium text-dark">{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--t2)]">Доставка</span>
          <span className="text-xs text-[var(--t2)]">
            {isInternational
              ? "Вартість уточнюється"
              : total >= FREE_SHIPPING_THRESHOLD
                ? "Безкоштовно"
                : "За тарифами перевізника"}
          </span>
        </div>
        {hasWeight && (
          <div className="flex justify-between">
            <span className="text-[var(--t2)]">Орієнтовна вага</span>
            <span className="text-xs text-[var(--t2)]">{totalWeight.toFixed(2)} кг</span>
          </div>
        )}
      </div>

      {!isInternational && remaining > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-[var(--t2)]">
            <Truck size={12} />
            До безкоштовної доставки ще{" "}
            <span className="font-medium text-coral">{formatPrice(Math.ceil(remaining))}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
            <div
              className="h-full rounded-full bg-coral transition-all"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="my-4 h-px bg-[var(--border)]" />

      <div className="flex items-center justify-between">
        <span className="font-unbounded text-sm font-bold text-dark">Разом</span>
        <span className="font-price text-xl font-bold text-dark">
          {formatPrice(total)}
        </span>
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting || !isValid || items.length === 0}
        className="font-unbounded mt-4 flex h-12 w-full items-center justify-center rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-50 disabled:shadow-none"
      >
        {submitting ? "Оформлення..." : "Оформити замовлення"}
      </button>

      <p className="mt-2 text-center text-[10px] text-[var(--t3)]">
        Натискаючи, ви погоджуєтесь з умовами оферти
      </p>
    </div>
  );
}
