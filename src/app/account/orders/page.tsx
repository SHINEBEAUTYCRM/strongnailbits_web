import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, Package, ShoppingBag } from "lucide-react";
import { ReorderButton } from "./ReorderButton";

export const metadata: Metadata = {
  title: "Мої замовлення",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Нове", color: "bg-blue-100 text-blue-700" },
  processing: { label: "В обробці", color: "bg-amber/10 text-amber" },
  shipped: { label: "Відправлено", color: "bg-violet/10 text-violet" },
  delivered: { label: "Доставлено", color: "bg-green/10 text-green" },
  cancelled: { label: "Скасовано", color: "bg-red/10 text-red" },
};

const SOURCE_LABELS: Record<string, string> = {
  web: "Сайт",
  app: "Додаток",
  "1c": "1С",
  telegram: "Telegram",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(v: number) {
  return v.toLocaleString("uk-UA");
}

interface OrderItem {
  product_id?: string;
  name?: string;
  product?: string;
  sku?: string;
  amount?: number;
  quantity?: number;
  price?: string | number;
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  // Collect all product IDs to fetch images in one query
  const allProductIds = new Set<string>();
  orders?.forEach((order) => {
    const items = (order.items as OrderItem[]) ?? [];
    items.forEach((item) => {
      if (item.product_id) allProductIds.add(item.product_id);
    });
  });

  let productImages: Map<string, { image: string | null; slug: string; max_qty: number }> = new Map();
  if (allProductIds.size > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, slug, quantity, images")
      .in("id", [...allProductIds]);

    if (products) {
      productImages = new Map(
        products.map((p: { id: string; slug: string; quantity: number; images: string[] | null }) => [
          p.id,
          {
            image: p.images && p.images.length > 0 ? p.images[0] : null,
            slug: p.slug,
            max_qty: p.quantity ?? 999,
          },
        ]),
      );
    }
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6">
      <Link
        href="/account"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--t2)] transition-colors hover:text-dark"
      >
        <ChevronLeft size={16} />
        Мій акаунт
      </Link>

      <h1 className="font-unbounded text-2xl font-black text-dark">
        Мої замовлення
      </h1>

      {!orders || orders.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sand">
            <Package size={32} className="text-[var(--t3)]" />
          </div>
          <p className="text-sm text-[var(--t2)]">У вас ще немає замовлень</p>
          <Link
            href="/catalog"
            className="font-unbounded rounded-pill bg-coral px-6 py-3 text-[13px] font-bold text-white transition-colors hover:bg-coral-2"
          >
            Перейти до каталогу
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] ?? {
              label: order.status,
              color: "bg-sand text-[var(--t2)]",
            };
            const items = (order.items as OrderItem[]) ?? [];
            const source = order.source || order.channel;
            const sourceLabel = source ? SOURCE_LABELS[source] || source : null;

            // Build reorder data
            const reorderItems = items
              .filter((item) => item.product_id)
              .map((item) => {
                const pi = productImages.get(item.product_id!);
                return {
                  product_id: item.product_id!,
                  name: item.name || item.product || "Товар",
                  slug: pi?.slug || "",
                  image: pi?.image || null,
                  price: Number(item.price) || 0,
                  old_price: null,
                  quantity: item.amount || item.quantity || 1,
                  sku: item.sku || null,
                  max_quantity: pi?.max_qty || 999,
                  weight: null,
                };
              });

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-[var(--border)] bg-white p-5"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-unbounded text-sm font-bold text-dark">
                    #{order.order_number}
                  </span>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                  {sourceLabel && (
                    <span className="rounded-full bg-sand px-2.5 py-0.5 text-[10px] font-medium text-[var(--t3)]">
                      {sourceLabel}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-[var(--t3)]">
                    {formatDate(order.created_at)}
                  </span>
                </div>

                {/* Items with photos */}
                {items.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                    {items.slice(0, 4).map((item, i) => {
                      const pi = item.product_id
                        ? productImages.get(item.product_id)
                        : null;
                      const imgSrc = pi?.image;
                      const qty = item.amount || item.quantity || 1;
                      const itemName = item.name || item.product || "Товар";

                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-sand">
                            {imgSrc ? (
                              <Image
                                src={imgSrc}
                                alt={itemName}
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
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-[var(--t1)]">
                              {itemName}
                            </p>
                            <p className="text-xs text-[var(--t3)]">
                              {qty} шт
                              {item.price
                                ? ` × ${formatPrice(Number(item.price))} ₴`
                                : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {items.length > 4 && (
                      <div className="text-xs text-[var(--t3)]">
                        + ще {items.length - 4} товарів
                      </div>
                    )}
                  </div>
                )}

                {/* Total + reorder */}
                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <div>
                    <span className="text-sm text-[var(--t2)]">Сума </span>
                    <span className="font-price text-lg font-bold text-dark">
                      {formatPrice(order.total)} ₴
                    </span>
                  </div>
                  {reorderItems.length > 0 && order.status !== "cancelled" && (
                    <ReorderButton items={reorderItems} />
                  )}
                </div>

                {order.ttn && (
                  <div className="mt-2 text-xs text-[var(--t2)]">
                    ТТН:{" "}
                    <span className="font-price font-medium">{order.ttn}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
