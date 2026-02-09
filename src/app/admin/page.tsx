import Link from "next/link";
import { DollarSign, ShoppingCart, Package, Users, AlertTriangle, ArrowUpRight } from "lucide-react";
import { getDashboardStats, getRecentOrders, getLowStockProducts } from "@/lib/admin/data";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Нове", color: "#60a5fa", bg: "#172554" },
  processing: { label: "В обробці", color: "#fbbf24", bg: "#422006" },
  shipped: { label: "Відправлено", color: "#a78bfa", bg: "#2e1065" },
  delivered: { label: "Доставлено", color: "#4ade80", bg: "#052e16" },
  cancelled: { label: "Скасовано", color: "#f87171", bg: "#450a0a" },
};

function fmt(v: number) { return v.toLocaleString("uk-UA"); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }

export default async function DashboardPage() {
  const [stats, recentOrders, lowStock] = await Promise.all([getDashboardStats(), getRecentOrders(8), getLowStockProducts(8)]);
  const cards = [
    { label: "Виручка", value: `${fmt(stats.totalRevenue)} ₴`, icon: DollarSign, href: "/admin/orders" },
    { label: "Замовлень сьогодні", value: String(stats.todayOrderCount), icon: ShoppingCart, href: "/admin/orders" },
    { label: "Товарів", value: String(stats.productCount), icon: Package, href: "/admin/products" },
    { label: "Клієнтів", value: String(stats.clientCount), icon: Users, href: "/admin/clients" },
  ];

  return (
    <div>
      <div className="mb-8"><h1 className="text-2xl font-semibold mb-1" style={{ color: "#f4f4f5" }}>Dashboard</h1><p className="text-sm" style={{ color: "#52525b" }}>Огляд магазину Shine Shop</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group rounded-2xl p-5 transition-colors" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#141420" }}><c.icon className="w-5 h-5" style={{ color: "#71717a" }} /></div>
              <ArrowUpRight className="w-4 h-4" style={{ color: "#27272a" }} />
            </div>
            <p className="text-2xl font-semibold font-mono tabular-nums" style={{ color: "#f4f4f5" }}>{c.value}</p>
            <p className="text-xs mt-1" style={{ color: "#52525b" }}>{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-6" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium" style={{ color: "#71717a" }}>Останні замовлення</h3><Link href="/admin/orders" className="text-xs" style={{ color: "#a855f7" }}>Всі →</Link></div>
          {recentOrders.length === 0 ? <p className="text-sm text-center py-8" style={{ color: "#3f3f46" }}>Замовлень ще немає</p> : (
            <div className="space-y-2">{recentOrders.map((o) => {
              const s = STATUS_MAP[o.status] ?? { label: o.status, color: "#71717a", bg: "#18181b" };
              const p = o.profiles as { first_name?: string; last_name?: string } | null;
              const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "—";
              return (<div key={o.id} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: "#111118" }}>
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-medium" style={{ color: "#e4e4e7" }}>#{o.order_number}</span><span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: s.color, background: s.bg }}>{s.label}</span></div><p className="text-xs mt-0.5 truncate" style={{ color: "#3f3f46" }}>{name} · {fmtDate(o.created_at)}</p></div>
                <span className="text-sm font-semibold font-mono tabular-nums shrink-0 ml-3" style={{ color: "#e4e4e7" }}>{fmt(Number(o.total))} ₴</span>
              </div>);
            })}</div>
          )}
        </div>
        <div className="rounded-2xl p-6" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
          <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4" style={{ color: "#fbbf24" }} /><h3 className="text-sm font-medium" style={{ color: "#71717a" }}>Закінчується на складі</h3></div>
          {lowStock.length === 0 ? <p className="text-sm text-center py-8" style={{ color: "#3f3f46" }}>Все в порядку</p> : (
            <div className="space-y-2">{lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: "#111118" }}>
                <div className="flex items-center gap-3 min-w-0">
                  {p.main_image_url ? <img src={p.main_image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" style={{ background: "#1a1a24" }} /> : <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: "#141420" }} />}
                  <span className="text-sm truncate" style={{ color: "#a1a1aa" }}>{p.name_uk}</span>
                </div>
                <span className="shrink-0 ml-3 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums" style={{ color: "#fbbf24", background: "#422006" }}>{p.quantity} шт</span>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
}
