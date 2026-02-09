import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { getDashboardStats, getRecentOrders, getLowStockProducts } from "@/lib/admin/data";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: "Нове", color: "bg-blue-500/20 text-blue-400" },
  processing: { label: "В обробці", color: "bg-amber-500/20 text-amber-400" },
  shipped: { label: "Відправлено", color: "bg-purple-500/20 text-purple-400" },
  delivered: { label: "Доставлено", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Скасовано", color: "bg-red-500/20 text-red-400" },
};

function formatPrice(v: number) {
  return v.toLocaleString("uk-UA");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const [stats, recentOrders, lowStock] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(8),
    getLowStockProducts(8),
  ]);

  const cards = [
    { label: "Виручка", value: `${formatPrice(stats.totalRevenue)} ₴`, icon: DollarSign, href: "/admin/orders" },
    { label: "Замовлень сьогодні", value: String(stats.todayOrderCount), icon: ShoppingCart, href: "/admin/orders" },
    { label: "Товарів", value: String(stats.productCount), icon: Package, href: "/admin/products" },
    { label: "Клієнтів", value: String(stats.clientCount), icon: Users, href: "/admin/clients" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Dashboard</h1>
        <p className="text-sm text-white/40">Огляд магазину Shine Shop</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 hover:bg-white/[0.04] transition-all duration-150"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <c.icon className="w-5 h-5 text-white/40" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors" />
            </div>
            <p className="text-2xl font-semibold text-white tabular-nums font-mono">{c.value}</p>
            <p className="text-xs text-white/40 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/60">Останні замовлення</h3>
            <Link href="/admin/orders" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              Всі →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-white/20 text-center py-8">Замовлень ще немає</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => {
                const s = STATUS_MAP[order.status] ?? { label: order.status, color: "bg-white/10 text-white/40" };
                const profile = order.profiles as { first_name?: string; last_name?: string } | null;
                const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "—";
                return (
                  <div key={order.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">#{order.order_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.color}`}>{s.label}</span>
                      </div>
                      <p className="text-xs text-white/30 mt-0.5 truncate">{name} · {formatDate(order.created_at)}</p>
                    </div>
                    <span className="text-sm font-semibold text-white tabular-nums font-mono shrink-0 ml-3">
                      {formatPrice(Number(order.total))} ₴
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-medium text-white/60">Закінчується на складі</h3>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-white/20 text-center py-8">Все в порядку</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.main_image_url ? (
                      <img src={p.main_image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 bg-white/5" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] shrink-0" />
                    )}
                    <span className="text-sm text-white/70 truncate">{p.name_uk}</span>
                  </div>
                  <span className="shrink-0 ml-3 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 tabular-nums">
                    {p.quantity} шт
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
