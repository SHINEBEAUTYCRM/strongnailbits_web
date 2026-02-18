import Link from "next/link";
import { Users } from "lucide-react";
import { getClients } from "@/lib/admin/data";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { ExportButton } from "@/components/admin/ExportButton";

function fmt(v: number) { return v.toLocaleString("uk-UA"); }
function fmtD(d: string) { return new Date(d).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit" }); }

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string; search?: string }> }) {
  const p = await searchParams;
  const page = Number(p.page) || 1;
  const { clients, total } = await getClients({ page, type: p.type, search: p.search });
  const tp = Math.ceil(total / 25);
  const types = [{ k: "all", l: "Всі" }, { k: "retail", l: "Роздріб" }, { k: "wholesale", l: "Опт" }];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "var(--a-text)" }}><Users className="w-6 h-6" style={{ color: "var(--a-accent)" }} />Клієнти</h1><p className="text-sm" style={{ color: "var(--a-text-4)" }}>{total} клієнтів</p></div>
        <div className="flex items-center gap-3"><AdminSearch placeholder="Пошук за ім'ям, email, телефоном..." /><ExportButton entity="clients" label="Експорт" /></div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">{types.map((t) => { const a = (p.type || "all") === t.k; return (
        <Link key={t.k} href={`/admin/clients?type=${t.k}`} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={a ? { background: "var(--a-accent-bg)", color: "var(--a-accent)", border: "1px solid var(--a-accent)" } : { background: "var(--a-bg-card)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}>{t.l}</Link>
      ); })}</div>
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: "1px solid var(--a-border)" }}>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Клієнт</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Телефон</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Тип</th>
          <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Замовлень</th>
          <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Витрачено</th>
          <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Дата</th>
        </tr></thead><tbody>{clients.map((c) => {
          const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
          const tc = c.type === "wholesale" ? { c: "#a78bfa", bg: "#2e1065" } : { c: "#71717a", bg: "#18181b" };
          return (<tr key={c.id} style={{ borderBottom: "1px solid var(--a-border)" }}>
            <td className="px-4 py-3"><p style={{ color: "var(--a-text-2)" }}>{name}</p><p className="text-[11px]" style={{ color: "var(--a-text-5)" }}>{c.email}</p>{c.company && <p className="text-[11px]" style={{ color: "var(--a-text-6)" }}>{c.company}</p>}</td>
            <td className="px-4 py-3 text-xs" style={{ color: "var(--a-text-3)" }}>{c.phone || "—"}</td>
            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: tc.c, background: tc.bg }}>{c.type === "wholesale" ? "Опт" : "Роздріб"}</span></td>
            <td className="px-4 py-3 text-right font-mono tabular-nums text-xs" style={{ color: "var(--a-text-3)" }}>{c.total_orders}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums text-xs" style={{ color: "var(--a-text-2)" }}>{fmt(Number(c.total_spent))} ₴</td>
            <td className="px-4 py-3 text-xs" style={{ color: "var(--a-text-4)" }}>{fmtD(c.created_at)}</td>
          </tr>);
        })}{clients.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: "var(--a-text-5)" }}>Клієнтів не знайдено</td></tr>}</tbody></table></div>
        {tp > 1 && <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--a-border)" }}>
          <p className="text-xs" style={{ color: "var(--a-text-5)" }}>Сторінка {page} з {tp}</p>
          <div className="flex gap-1">
            {page > 1 && <Link href={`/admin/clients?page=${page - 1}&type=${p.type || "all"}${p.search ? `&search=${encodeURIComponent(p.search)}` : ""}`} className="px-3 py-1 rounded-lg text-xs" style={{ color: "var(--a-text-3)", background: "var(--a-bg-card)" }}>←</Link>}
            {page < tp && <Link href={`/admin/clients?page=${page + 1}&type=${p.type || "all"}${p.search ? `&search=${encodeURIComponent(p.search)}` : ""}`} className="px-3 py-1 rounded-lg text-xs" style={{ color: "var(--a-text-3)", background: "var(--a-bg-card)" }}>→</Link>}
          </div>
        </div>}
      </div>
    </div>
  );
}
