"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  XCircle,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { showToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { CartItem } from "@/types/cart";

interface Props {
  items: CartItem[];
}

interface StockItem {
  item: CartItem;
  status: "ok" | "partial" | "unavailable";
  available: number;
  freshImage: string | null;
  freshPrice: number;
  freshName: string;
}

export function ReorderButton({ items }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  const checkStock = useCallback(async () => {
    setLoading(true);
    try {
      interface ProductStock {
        id: string;
        name_uk: string;
        slug: string;
        price: number;
        quantity: number;
        images: string[] | null;
      }

      const supabase = createClient();
      const ids = items.map((i) => i.product_id);

      const { data: products } = await supabase
        .from("products")
        .select("id, name_uk, slug, price, quantity, images")
        .in("id", ids)
        .returns<ProductStock[]>();

      const productMap = new Map(
        (products ?? []).map((p) => [p.id, p]),
      );

      const result: StockItem[] = items.map((item) => {
        const p = productMap.get(item.product_id);
        if (!p) {
          return {
            item,
            status: "unavailable" as const,
            available: 0,
            freshImage: null,
            freshPrice: item.price,
            freshName: item.name,
          };
        }
        const stock = p.quantity ?? 0;
        const freshImage = p.images && p.images.length > 0 ? p.images[0] : null;
        const freshPrice = p.price ?? item.price;
        const freshName = p.name_uk || item.name;

        let status: "ok" | "partial" | "unavailable" = "ok";
        if (stock <= 0) status = "unavailable";
        else if (stock < item.quantity) status = "partial";

        return {
          item: {
            ...item,
            slug: p.slug || item.slug,
            max_quantity: stock,
          },
          status,
          available: Math.max(0, stock),
          freshImage,
          freshPrice,
          freshName,
        };
      });

      setStockItems(result);
    } catch {
      showToast("Помилка перевірки наявності", "error");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [items]);

  useEffect(() => {
    if (open) checkStock();
  }, [open, checkStock]);

  function handleAdd() {
    let count = 0;
    stockItems.forEach((si) => {
      if (si.status === "unavailable") return;
      const qty = si.status === "partial" ? si.available : si.item.quantity;
      if (qty <= 0) return;
      addItem({
        ...si.item,
        price: si.freshPrice,
        name: si.freshName,
        image: si.freshImage ?? si.item.image,
        quantity: qty,
        max_quantity: si.available,
      });
      count += qty;
    });

    setOpen(false);

    if (count > 0) {
      showToast(`${count} товарів додано в кошик`);
      window.dispatchEvent(new CustomEvent("open-cart"));
    }
  }

  const availableItems = stockItems.filter((si) => si.status !== "unavailable");
  const totalAvailable = availableItems.reduce(
    (sum, si) =>
      sum +
      si.freshPrice *
        (si.status === "partial" ? si.available : si.item.quantity),
    0,
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-pill border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
      >
        <RotateCcw size={13} />
        Повторити
      </button>

      {/* Backdrop + Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/30 transition-opacity"
            onClick={() => setOpen(false)}
          />

          <div className="fixed inset-x-0 bottom-0 z-[90] sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
            <div className="flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-[var(--border)] bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <h3 className="font-unbounded text-sm font-bold text-dark">
                  Повторити замовлення
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--t2)] hover:text-dark"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5">
                {loading ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 size={24} className="animate-spin text-[var(--t3)]" />
                    <p className="text-sm text-[var(--t2)]">
                      Перевіряю наявність...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {stockItems.map((si) => (
                      <div
                        key={si.item.product_id}
                        className={`flex items-center gap-3 rounded-xl border p-3 ${
                          si.status === "unavailable"
                            ? "border-red/20 bg-red/5 opacity-60"
                            : si.status === "partial"
                              ? "border-amber/20 bg-amber/5"
                              : "border-green/20 bg-green/5"
                        }`}
                      >
                        {/* Status icon */}
                        <div className="shrink-0">
                          {si.status === "ok" && (
                            <Check size={16} className="text-green" />
                          )}
                          {si.status === "partial" && (
                            <AlertTriangle size={16} className="text-amber" />
                          )}
                          {si.status === "unavailable" && (
                            <XCircle size={16} className="text-red" />
                          )}
                        </div>

                        {/* Photo */}
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-sand">
                          {si.freshImage ? (
                            <Image
                              src={si.freshImage}
                              alt={si.freshName}
                              fill
                              sizes="48px"
                              className="object-contain p-0.5"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[var(--t3)]">
                              <ShoppingBag size={16} strokeWidth={1} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${
                              si.status === "unavailable"
                                ? "text-[var(--t3)] line-through"
                                : "text-dark"
                            }`}
                          >
                            {si.freshName}
                          </p>
                          {si.status === "ok" && (
                            <p className="text-xs text-green">
                              {si.item.quantity} шт ×{" "}
                              {si.freshPrice.toLocaleString("uk-UA")} ₴
                            </p>
                          )}
                          {si.status === "partial" && (
                            <p className="text-xs text-amber">
                              Доступно {si.available} з {si.item.quantity}
                            </p>
                          )}
                          {si.status === "unavailable" && (
                            <p className="text-xs text-red">
                              Немає в наявності
                            </p>
                          )}
                        </div>

                        {/* Price */}
                        {si.status !== "unavailable" && (
                          <span className="font-price shrink-0 text-sm font-bold text-dark">
                            {(
                              si.freshPrice *
                              (si.status === "partial"
                                ? si.available
                                : si.item.quantity)
                            ).toLocaleString("uk-UA")}{" "}
                            ₴
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {!loading && (
                <div className="border-t border-[var(--border)] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-[var(--t2)]">
                      Доступно {availableItems.length} з {stockItems.length}{" "}
                      товарів
                    </span>
                    <span className="font-price text-lg font-bold text-dark">
                      {totalAvailable.toLocaleString("uk-UA")} ₴
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setOpen(false)}
                      className="flex h-11 flex-1 items-center justify-center rounded-pill border border-[var(--border)] text-sm font-medium text-[var(--t2)] transition-colors hover:border-dark hover:text-dark"
                    >
                      Закрити
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={availableItems.length === 0}
                      className="font-unbounded flex h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-coral text-[12px] font-bold text-white transition-all hover:bg-coral-2 disabled:opacity-40"
                    >
                      <ShoppingBag size={15} />
                      Додати в кошик
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
