import Link from "next/link";
import { DollarSign, ShoppingCart, Package, Users, AlertTriangle, ArrowUpRight } from "lucide-react";
import { getDashboardStats, getRecentOrders, getLowStockProducts } from "@/lib/admin/data";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Нове", color: "var(--a-st-new-c)", bg: "var(--a-st-new-bg)" },
  processing: { label: "В обробці", color: "var(--a-st-processing-c)", bg: "var(--a-st-processing-bg)" },
  shipped: { label: "Відправлено", color: "var(--a-st-shipped-c)", bg: "var(--a-st-shipped-bg)" },
  delivered: { label: "Доставлено", color: "var(--a-st-delivered-c)", bg: "var(--a-st-delivered-bg)" },
  cancelled: { label: "Скасовано", color: "var(--a-st-cancelled-c)", bg: "var(--a-st-cancelled-bg)" },
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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--a-text)" }}>Dashboard</h1>
        <p className="text-sm" style={{ color: "var(--a-text-4)" }}>Огляд магазину Shine Shop</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group rounded-2xl p-5 transition-colors" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--a-bg-hover)" }}><c.icon className="w-5 h-5" style={{ color: "var(--a-text-3)" }} /></div>
              <ArrowUpRight className="w-4 h-4" style={{ color: "var(--a-text-6)" }} />
            </div>
            <p className="text-2xl font-semibold font-mono tabular-nums" style={{ color: "var(--a-text)" }}>{c.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--a-text-4)" }}>{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-6" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium" style={{ color: "var(--a-text-3)" }}>Останні замовлення</h3>
            <Link href="/admin/orders" className="text-xs" style={{ color: "var(--a-accent)" }}>Всі →</Link>
          </div>
          {recentOrders.length === 0 ? <p className="text-sm text-center py-8" style={{ color: "var(--a-text-5)" }}>Замовлень ще немає</p> : (
            <div className="space-y-2">{recentOrders.map((o) => {
              const s = STATUS_MAP[o.status] ?? { label: o.status, color: "#71717a", bg: "#18181b" };
              const p = o.profiles as { first_name?: string; last_name?: string } | null;
              const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "—";
              return (<div key={o.id} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: "var(--a-bg-input)" }}>
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-medium" style={{ color: "var(--a-text-body)" }}>#{o.order_number}</span><span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: s.color, background: s.bg }}>{s.label}</span></div><p className="text-xs mt-0.5 truncate" style={{ color: "var(--a-text-5)" }}>{name} · {fmtDate(o.created_at)}</p></div>
                <span className="text-sm font-semibold font-mono tabular-nums shrink-0 ml-3" style={{ color: "var(--a-text-body)" }}>{fmt(Number(o.total))} ₴</span>
              </div>);
            })}</div>
          )}
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
          <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4" style={{ color: "#fbbf24" }} /><h3 className="text-sm font-medium" style={{ color: "var(--a-text-3)" }}>Закінчується на складі</h3></div>
          {lowStock.length === 0 ? <p className="text-sm text-center py-8" style={{ color: "var(--a-text-5)" }}>Все в порядку</p> : (
            <div className="space-y-2">{lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: "var(--a-bg-input)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  {p.main_image_url ? <img src={p.main_image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" style={{ background: "var(--a-bg-muted)" }} /> : <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: "var(--a-bg-hover)" }} />}
                  <span className="text-sm truncate" style={{ color: "var(--a-text-2)" }}>{p.name_uk}</span>
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
