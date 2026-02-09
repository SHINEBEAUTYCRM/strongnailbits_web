import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getOrders } from "@/lib/admin/data";
import { AdminSearch } from "@/components/admin/AdminSearch";

const SM: Record<string, { label: string; c: string; bg: string }> = { new: { label: "Нове", c: "#60a5fa", bg: "#172554" }, processing: { label: "В обробці", c: "#fbbf24", bg: "#422006" }, shipped: { label: "Відправлено", c: "#a78bfa", bg: "#2e1065" }, delivered: { label: "Доставлено", c: "#4ade80", bg: "#052e16" }, cancelled: { label: "Скасовано", c: "#f87171", bg: "#450a0a" } };
const PM: Record<string, string> = { pending: "Очікує", paid: "Оплачено", failed: "Помилка" };
function fmt(v: number) { return v.toLocaleString("uk-UA"); }
function fmtD(d: string) { return new Date(d).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); }

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; search?: string }> }) {
  const p = await searchParams;
  const page = Number(p.page) || 1;
  const { orders, total } = await getOrders({ page, status: p.status, search: p.search });
  const tp = Math.ceil(total / 25);
  const statuses = ["all", "new", "processing", "shipped", "delivered", "cancelled"];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "#f4f4f5" }}><ShoppingBag className="w-6 h-6" style={{ color: "#a855f7" }} />Замовлення</h1><p className="text-sm" style={{ color: "#52525b" }}>{total} замовлень</p></div>
        <AdminSearch placeholder="Пошук за номером, ТТН..." />
      </div>
      <div className="flex flex-wrap gap-2 mb-6">{statuses.map((s) => { const a = (p.status || "all") === s; const l = s === "all" ? "Всі" : SM[s]?.label ?? s; return (
        <Link key={s} href={`/admin/orders?status=${s}${p.search ? `&search=${p.search}` : ""}`} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={a ? { background: "#1e1030", color: "#c084fc", border: "1px solid #581c87" } : { background: "#111116", color: "#71717a", border: "1px solid #1e1e2a" }}>{l}</Link>
      ); })}</div>
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: "1px solid #1e1e2a" }}>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Номер</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Дата</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Клієнт</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Статус</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Оплата</th>
          <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Сума</th>
        </tr></thead><tbody>{orders.map((o) => {
          const s = SM[o.status] ?? { label: o.status, c: "#71717a", bg: "#18181b" };
          const ps = PM[o.payment_status] ?? o.payment_status;
          const pr = o.profiles as { first_name?: string; last_name?: string; phone?: string } | null;
          const name = [pr?.first_name, pr?.last_name].filter(Boolean).join(" ") || "—";
          return (<tr key={o.id} style={{ borderBottom: "1px solid #141420" }}>
            <td className="px-4 py-3"><span className="font-medium" style={{ color: "#e4e4e7" }}>#{o.order_number}</span></td>
            <td className="px-4 py-3" style={{ color: "#71717a" }}>{fmtD(o.created_at)}</td>
            <td className="px-4 py-3"><p style={{ color: "#a1a1aa" }}>{name}</p>{pr?.phone && <p className="text-[11px]" style={{ color: "#3f3f46" }}>{pr.phone}</p>}</td>
            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: s.c, background: s.bg }}>{s.label}</span></td>
            <td className="px-4 py-3 text-xs" style={{ color: "#71717a" }}>{ps}</td>
            <td className="px-4 py-3 text-right font-semibold font-mono tabular-nums" style={{ color: "#e4e4e7" }}>{fmt(Number(o.total))} ₴</td>
          </tr>);
        })}{orders.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: "#3f3f46" }}>Замовлень не знайдено</td></tr>}</tbody></table></div>
        {tp > 1 && <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid #1e1e2a" }}>
          <p className="text-xs" style={{ color: "#3f3f46" }}>Сторінка {page} з {tp}</p>
          <div className="flex gap-1">
            {page > 1 && <Link href={`/admin/orders?page=${page - 1}&status=${p.status || "all"}`} className="px-3 py-1 rounded-lg text-xs" style={{ color: "#71717a", background: "#111116" }}>←</Link>}
            {page < tp && <Link href={`/admin/orders?page=${page + 1}&status=${p.status || "all"}`} className="px-3 py-1 rounded-lg text-xs" style={{ color: "#71717a", background: "#111116" }}>→</Link>}
          </div>
        </div>}
      </div>
    </div>
  );
}
