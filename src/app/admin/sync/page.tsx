import { RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { getSyncLogs } from "@/lib/admin/data";
import { SyncButtons } from "./SyncButtons";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function duration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default async function SyncPage() {
  const logs = await getSyncLogs(20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-purple-400" />
            Синхронізація
          </h1>
          <p className="text-sm text-white/40">CS-Cart → Supabase</p>
        </div>
      </div>

      {/* Sync buttons */}
      <SyncButtons />

      {/* Logs */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden mt-6">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white/60">Історія синхронізацій</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">Сутність</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">Статус</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">Оброблено</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">Створено</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">Оновлено</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">Помилок</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">Час</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">Тривалість</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const statusIcon = log.status === "success"
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  : log.status === "error"
                    ? <XCircle className="w-3.5 h-3.5 text-red-400" />
                    : <Clock className="w-3.5 h-3.5 text-amber-400" />;
                return (
                  <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 text-white/70 capitalize">{log.entity}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">{statusIcon}<span className="text-xs text-white/50">{log.status}</span></div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-white/50 tabular-nums font-mono text-xs">{log.items_processed}</td>
                    <td className="px-4 py-2.5 text-right text-green-400/70 tabular-nums font-mono text-xs">{log.items_created}</td>
                    <td className="px-4 py-2.5 text-right text-amber-400/70 tabular-nums font-mono text-xs">{log.items_updated}</td>
                    <td className="px-4 py-2.5 text-right text-red-400/70 tabular-nums font-mono text-xs">{log.items_failed}</td>
                    <td className="px-4 py-2.5 text-white/40 text-xs">{formatDate(log.started_at)}</td>
                    <td className="px-4 py-2.5 text-white/40 text-xs font-mono">{duration(log.started_at, log.completed_at)}</td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-white/20">Логів синхронізації немає</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
