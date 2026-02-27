import Link from "next/link";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { getOrders } from "@/lib/admin/data";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { ExportButton } from "@/components/admin/ExportButton";
import { NPTrackingBadge } from "@/components/admin/NPTrackingBadge";

const SOURCE_ICON: Record<string, string> = {
  web: "🌐",
  mobile: "📱",
  api: "⚙️",
  "1c": "🏢",
};

const SM: Record<string, { label: string; cVar: string; bgVar: string }> = {
  new: { label: "Нове", cVar: "var(--a-st-new-c)", bgVar: "var(--a-st-new-bg)" },
  processing: { label: "В обробці", cVar: "var(--a-st-processing-c)", bgVar: "var(--a-st-processing-bg)" },
  shipped: { label: "Відправлено", cVar: "var(--a-st-shipped-c)", bgVar: "var(--a-st-shipped-bg)" },
  delivered: { label: "Доставлено", cVar: "var(--a-st-delivered-c)", bgVar: "var(--a-st-delivered-bg)" },
  cancelled: { label: "Скасовано", cVar: "var(--a-st-cancelled-c)", bgVar: "var(--a-st-cancelled-bg)" },
};
const PM: Record<string, string> = { pending: "Очікує", paid: "Оплачено", failed: "Помилка" };
function fmt(v: number) { return v.toLocaleString("uk-UA"); }
function fmtD(d: string) { return new Date(d).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); }

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; search?: string }> }) {
  const p = await searchParams;
  const page = Number(p.page) || 1;
  const limit = 25;
  const { orders, total } = await getOrders({ page, limit, status: p.status, search: p.search });
  const tp = Math.ceil(total / limit);
  const statuses = ["all", "new", "processing", "shipped", "delivered", "cancelled"];

  const qp = (pg: number) => `/admin/orders?page=${pg}&status=${p.status || "all"}${p.search ? `&search=${p.search}` : ""}`;
  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(tp, page + 2); i++) pages.push(i);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "var(--a-text)" }}>
            <ShoppingBag className="w-6 h-6" style={{ color: "var(--a-accent)" }} />Замовлення
          </h1>
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>{total} замовлень</p>
        </div>
        <div className="flex items-center gap-3">
          <AdminSearch placeholder="Пошук за номером, ТТН..." />
          <ExportButton entity="orders" />
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statuses.map((s) => {
          const a = (p.status || "all") === s;
          const l = s === "all" ? "Всі" : SM[s]?.label ?? s;
          const sm = SM[s];
          return (
            <Link key={s} href={`/admin/orders?status=${s}${p.search ? `&search=${p.search}` : ""}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={a
                ? (sm ? { background: sm.bgVar, color: sm.cVar, border: "1px solid currentColor" } : { background: "var(--a-accent-bg)", color: "var(--a-accent)", border: "1px solid var(--a-accent)" })
                : { background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}>
              {l}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Замовлення</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--a-text-5)" }}>Дата</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Клієнт</th>
                <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Статус</th>
                <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--a-text-5)" }}>Оплата</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Сума</th>
                <th className="w-8 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const s = SM[o.status] ?? { label: o.status, cVar: "var(--a-text-3)", bgVar: "var(--a-bg-input)" };
                const ps = PM[o.payment_status] ?? o.payment_status;
                const pr = o.profiles as { first_name?: string; last_name?: string; phone?: string } | null;
                const name = [pr?.first_name, pr?.last_name].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={o.id} className="admin-row transition-colors cursor-default" style={{ borderBottom: "1px solid var(--a-border-sub)" }}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline" style={{ color: "var(--a-text-body)" }}>
                        <span title={o.source || "web"}>{SOURCE_ICON[o.source || "web"] || "🌐"}</span>{" "}#{o.order_number}
                      </Link>
                      {o.ttn && <NPTrackingBadge ttn={o.ttn} />}
                    </td>
                    <td className="px-4 py-3 text-xs hidden sm:table-cell" style={{ color: "var(--a-text-3)" }}>{fmtD(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: "var(--a-text-2)" }}>{name}</p>
                      {pr?.phone && <p className="text-[11px] mt-0.5" style={{ color: "var(--a-text-5)" }}>{pr.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ color: s.cVar, background: s.bgVar }}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs hidden md:table-cell" style={{ color: "var(--a-text-3)" }}>{ps}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold font-mono tabular-nums" style={{ color: "var(--a-text-body)" }}>{fmt(Number(o.total))} ₴</span>
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/admin/orders/${o.id}`} style={{ color: "var(--a-text-5)" }}><ChevronRight className="w-4 h-4" /></Link>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: "var(--a-text-5)" }}>Замовлень не знайдено</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {tp > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--a-border)" }}>
            <p className="text-xs" style={{ color: "var(--a-text-5)" }}>
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} з {total}
            </p>
            <div className="flex gap-1">
              {page > 1 && <Link href={qp(page - 1)} className="px-2.5 py-1 rounded-lg text-xs" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)" }}>←</Link>}
              {pages[0] > 1 && <span className="px-1 py-1 text-xs" style={{ color: "var(--a-text-5)" }}>...</span>}
              {pages.map((pg) => (
                <Link key={pg} href={qp(pg)} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={pg === page ? { color: "var(--a-accent)", background: "var(--a-accent-bg)" } : { color: "var(--a-text-3)", background: "var(--a-bg-input)" }}>
                  {pg}
                </Link>
              ))}
              {pages[pages.length - 1] < tp && <span className="px-1 py-1 text-xs" style={{ color: "var(--a-text-5)" }}>...</span>}
              {page < tp && <Link href={qp(page + 1)} className="px-2.5 py-1 rounded-lg text-xs" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)" }}>→</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
