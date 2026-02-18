"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  History,
  ArrowLeft,
  Loader2,
  Undo2,
  Check,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";

interface BatchRecord {
  id: string;
  type: string;
  status: string;
  filename: string | null;
  total_rows: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  created_at: string;
  completed_at: string | null;
  rolled_back_at: string | null;
}

export default function ImportHistoryPage() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import/history");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBatches(json.batches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  const handleRollback = async (batchId: string) => {
    if (!confirm("Ви впевнені? Всі створені товари будуть видалені, а оновлені — повернуті до попередніх значень.")) return;

    setRollingBack(batchId);
    try {
      const res = await fetch(`/api/admin/import/rollback/${batchId}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rollback failed");
      alert(`Відкачено: видалено ${json.rolled_back.deleted}, відновлено ${json.rolled_back.restored}`);
      loadBatches();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Помилка відкату");
    }
    setRollingBack(null);
  };

  const canRollback = (b: BatchRecord): boolean => {
    if (b.status !== "completed") return false;
    if (b.rolled_back_at) return false;
    const hoursSince = (Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60);
    return hoursSince < 24;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " + date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  };

  const statusBadge = (b: BatchRecord) => {
    switch (b.status) {
      case "completed":
        return { icon: <Check className="w-3 h-3" />, label: "Завершено", color: "#4ade80", bg: "#052e16" };
      case "rolled_back":
        return { icon: <Undo2 className="w-3 h-3" />, label: "Відкачено", color: "var(--a-text-4)", bg: "var(--a-bg-input)" };
      case "processing":
        return { icon: <RefreshCw className="w-3 h-3 animate-spin" />, label: "Обробка", color: "#fbbf24", bg: "#422006" };
      case "failed":
        return { icon: <XCircle className="w-3 h-3" />, label: "Помилка", color: "#f87171", bg: "#450a0a" };
      default:
        return { icon: null, label: b.status, color: "var(--a-text-4)", bg: "var(--a-bg-input)" };
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "var(--a-text)" }}>
            <History className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
            Історія імпортів
          </h1>
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
            Всі операції імпорту товарів
          </p>
        </div>
        <Link href="/admin/import"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0"
          style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}>
          <ArrowLeft className="w-4 h-4" /> До імпорту
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: "#450a0a", border: "1px solid #f8717140", color: "#f87171" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: "var(--a-accent)" }} />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                  <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Дата</th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--a-text-5)" }}>Файл</th>
                  <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Рядків</th>
                  <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Створено</th>
                  <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Оновлено</th>
                  <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--a-text-5)" }}>Помилки</th>
                  <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Статус</th>
                  <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const st = statusBadge(b);
                  const rollbackable = canRollback(b);
                  const isRollingBack = rollingBack === b.id;

                  return (
                    <tr key={b.id} className="admin-row transition-colors" style={{ borderBottom: "1px solid var(--a-border-sub)" }}>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--a-text-3)" }}>
                        {formatDate(b.created_at)}
                      </td>
                      <td className="px-4 py-3 text-xs hidden sm:table-cell max-w-[200px] truncate" style={{ color: "var(--a-text-2)" }}>
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--a-text-4)" }} />
                          {b.filename || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-mono tabular-nums" style={{ color: "var(--a-text-3)" }}>
                        {b.total_rows}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-mono tabular-nums" style={{ color: "#4ade80" }}>
                        {b.created_count > 0 ? `+${b.created_count}` : "0"}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-mono tabular-nums" style={{ color: "#fbbf24" }}>
                        {b.updated_count || "0"}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-mono tabular-nums hidden md:table-cell" style={{ color: b.error_count > 0 ? "#f87171" : "var(--a-text-4)" }}>
                        {b.error_count || "0"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ color: st.color, background: st.bg }}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {rollbackable && (
                          <button
                            onClick={() => handleRollback(b.id)}
                            disabled={isRollingBack}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium disabled:opacity-50"
                            style={{ background: "#450a0a", color: "#f87171", border: "1px solid #f8717130" }}
                            title="Відкатити імпорт"
                          >
                            {isRollingBack ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                            Відкат
                          </button>
                        )}
                        {b.status === "rolled_back" && (
                          <span className="text-[10px]" style={{ color: "var(--a-text-4)" }}>
                            {b.rolled_back_at ? formatDate(b.rolled_back_at) : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: "var(--a-text-5)" }}>
                      Імпортів ще не було
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
