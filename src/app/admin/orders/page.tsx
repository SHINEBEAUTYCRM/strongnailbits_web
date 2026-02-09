import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getOrders } from "@/lib/admin/data";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: "Нове", color: "bg-blue-500/20 text-blue-400" },
  processing: { label: "В обробці", color: "bg-amber-500/20 text-amber-400" },
  shipped: { label: "Відправлено", color: "bg-purple-500/20 text-purple-400" },
  delivered: { label: "Доставлено", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Скасовано", color: "bg-red-500/20 text-red-400" },
};

const PAYMENT_MAP: Record<string, string> = {
  pending: "Очікує",
  paid: "Оплачено",
  failed: "Помилка",
};

function formatPrice(v: number) {
  return v.toLocaleString("uk-UA");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { orders, total } = await getOrders({
    page,
    status: params.status,
    search: params.search,
  });
  const totalPages = Math.ceil(total / 25);

  const statuses = ["all", "new", "processing", "shipped", "delivered", "cancelled"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-purple-400" />
            Замовлення
          </h1>
          <p className="text-sm text-white/40">{total} замовлень</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statuses.map((s) => {
          const active = (params.status || "all") === s;
          const label = s === "all" ? "Всі" : (STATUS_MAP[s]?.label ?? s);
          return (
            <Link
              key={s}
              href={`/admin/orders?status=${s}${params.search ? `&search=${params.search}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                active
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                  : "text-white/40 hover:text-white/60 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Номер</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Дата</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Клієнт</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Статус</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Оплата</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Сума</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const s = STATUS_MAP[order.status] ?? { label: order.status, color: "bg-white/10 text-white/40" };
                const ps = PAYMENT_MAP[order.payment_status] ?? order.payment_status;
                const profile = order.profiles as { first_name?: string; last_name?: string; phone?: string } | null;
                const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-white">#{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3 text-white/50">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-white/70">{name}</p>
                      {profile?.phone && <p className="text-[11px] text-white/30">{profile.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">{ps}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white tabular-nums font-mono">
                      {formatPrice(Number(order.total))} ₴
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/20">
                    Замовлень не знайдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">Сторінка {page} з {totalPages}</p>
            <div className="flex gap-1">
              {page > 1 && (
                <Link href={`/admin/orders?page=${page - 1}&status=${params.status || "all"}`} className="px-3 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                  ←
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/orders?page=${page + 1}&status=${params.status || "all"}`} className="px-3 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                  →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
