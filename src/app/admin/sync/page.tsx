import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { getSyncLogs } from "@/lib/admin/data";
import { SyncButtons } from "./SyncButtons";

function fmtD(d: string) { return new Date(d).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
function dur(s: string, e: string | null) { if (!e) return "—"; const ms = new Date(e).getTime() - new Date(s).getTime(); return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`; }

export default async function SyncPage() {
  const logs = await getSyncLogs(20);
  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "#f4f4f5" }}><RefreshCw className="w-6 h-6" style={{ color: "#a855f7" }} />Синхронізація</h1><p className="text-sm" style={{ color: "#52525b" }}>CS-Cart → Supabase</p></div>
      <SyncButtons />
      <div className="rounded-2xl overflow-hidden mt-6" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e2a" }}><h3 className="text-sm font-medium" style={{ color: "#71717a" }}>Історія синхронізацій</h3></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{ borderBottom: "1px solid #1e1e2a" }}>
          <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Сутність</th>
          <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Статус</th>
          <th className="text-right px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Оброблено</th>
          <th className="text-right px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Створено</th>
          <th className="text-right px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Оновлено</th>
          <th className="text-right px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Помилок</th>
          <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Час</th>
          <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Тривалість</th>
        </tr></thead><tbody>{logs.map((l) => {
          const si = l.status === "success" ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "#4ade80" }} /> : l.status === "error" ? <XCircle className="w-3.5 h-3.5" style={{ color: "#f87171" }} /> : <Clock className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />;
          return (<tr key={l.id} style={{ borderBottom: "1px solid #141420" }}>
            <td className="px-4 py-2.5 capitalize" style={{ color: "#a1a1aa" }}>{l.entity}</td>
            <td className="px-4 py-2.5"><div className="flex items-center gap-1.5">{si}<span className="text-xs" style={{ color: "#71717a" }}>{l.status}</span></div></td>
            <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: "#71717a" }}>{l.items_processed}</td>
            <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: "#4ade80" }}>{l.items_created}</td>
            <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: "#fbbf24" }}>{l.items_updated}</td>
            <td className="px-4 py-2.5 text-right font-mono text-xs" style={{ color: "#f87171" }}>{l.items_failed}</td>
            <td className="px-4 py-2.5 text-xs" style={{ color: "#52525b" }}>{fmtD(l.started_at)}</td>
            <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "#52525b" }}>{dur(l.started_at, l.completed_at)}</td>
          </tr>);
        })}{logs.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: "#3f3f46" }}>Логів немає</td></tr>}</tbody></table></div>
      </div>
    </div>
  );
}
