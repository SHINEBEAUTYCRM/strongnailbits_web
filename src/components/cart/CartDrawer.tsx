"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice } from "@/utils/format";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getTotal = useCartStore((s) => s.getTotal);
  const getCount = useCartStore((s) => s.getCount);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const total = getTotal();
  const count = getCount();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/30"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-[var(--border)] bg-pearl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-coral" />
                <h2 className="font-unbounded text-sm font-bold text-dark">
                  Кошик
                </h2>
                {count > 0 && (
                  <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-[var(--t2)]">
                    {count}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--t2)] transition-colors hover:text-dark"
                aria-label="Закрити"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sand">
                  <ShoppingBag size={32} strokeWidth={1.5} className="text-[var(--t3)]" />
                </div>
                <p className="font-unbounded text-sm font-bold text-dark">
                  Кошик порожній
                </p>
                <p className="text-sm text-[var(--t2)]">
                  Додайте товари з каталогу
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 flex items-center gap-2 rounded-pill border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
                >
                  Перейти до каталогу
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex flex-col gap-4">
                  {items.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex gap-3 rounded-card border border-[var(--border)] bg-white p-3"
                    >
                      <Link
                        href={`/product/${item.slug}`}
                        onClick={onClose}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[10px] bg-sand"
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="80px"
                            className="object-contain p-1"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[var(--t3)]">
                            <ShoppingBag size={20} strokeWidth={1} />
                          </div>
                        )}
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={onClose}
                          className="line-clamp-2 text-sm font-medium leading-snug text-dark transition-colors hover:text-coral"
                        >
                          {item.name}
                        </Link>

                        {item.sku && (
                          <span className="font-price text-[10px] text-[var(--t3)]">
                            {item.sku}
                          </span>
                        )}

                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex h-8 items-center rounded-[10px] border border-[var(--border)] bg-white">
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              className="flex h-full w-8 items-center justify-center text-[var(--t3)] hover:text-dark"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-price w-7 text-center text-xs font-semibold text-dark">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              disabled={item.quantity >= item.max_quantity}
                              className="flex h-full w-8 items-center justify-center text-[var(--t3)] hover:text-dark disabled:opacity-30"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-price text-sm font-bold text-dark">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                            <button
                              onClick={() => removeItem(item.product_id)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--t3)] transition-all hover:bg-red/10 hover:text-red"
                              aria-label="Видалити"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-[var(--border)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-[var(--t2)]">
                    Разом ({count} товарів):
                  </span>
                  <span className="font-price text-xl font-bold text-dark">
                    {formatPrice(total)}
                  </span>
                </div>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="font-unbounded flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral"
                >
                  Оформити замовлення
                  <ArrowRight size={16} />
                </Link>
                <button
                  onClick={onClose}
                  className="mt-2 flex h-10 w-full items-center justify-center text-sm text-[var(--t2)] transition-colors hover:text-dark"
                >
                  Продовжити покупки
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
