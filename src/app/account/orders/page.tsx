import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, Package } from "lucide-react";

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
            const items = (order.items as Array<{ name?: string; product?: string; amount?: number; quantity?: number; price?: string | number }>) ?? [];

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-[var(--border)] bg-white p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-unbounded text-sm font-bold text-dark">
                    #{order.order_number}
                  </span>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                  <span className="ml-auto text-xs text-[var(--t3)]">
                    {formatDate(order.created_at)}
                  </span>
                </div>

                {items.length > 0 && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    {items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-[var(--t2)]">
                          {item.name || item.product || "Товар"}{" "}
                          &times; {item.amount || item.quantity || 1}
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="mt-1 text-xs text-[var(--t3)]">
                        + ще {items.length - 3} товарів
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <span className="text-sm text-[var(--t2)]">Сума</span>
                  <span className="font-price text-lg font-bold text-dark">
                    {formatPrice(order.total)} ₴
                  </span>
                </div>

                {order.ttn && (
                  <div className="mt-2 text-xs text-[var(--t2)]">
                    ТТН: <span className="font-price font-medium">{order.ttn}</span>
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
