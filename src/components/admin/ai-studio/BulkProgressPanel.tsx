"use client";

interface BulkResult {
  id: string;
  name: string;
  status: "success" | "skipped" | "error";
  tokens?: number;
  error?: string;
}

interface BulkProgressPanelProps {
  total: number;
  processed: number;
  results: BulkResult[];
  running: boolean;
  paused: boolean;
  onPause: () => void;
  onStop: () => void;
  onAcceptAll: () => void;
  onCancel: () => void;
}

export function BulkProgressPanel({
  total,
  processed,
  results,
  running,
  paused,
  onPause,
  onStop,
  onAcceptAll,
  onCancel,
}: BulkProgressPanelProps) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const successCount = results.filter(r => r.status === "success").length;
  const errorCount = results.filter(r => r.status === "error").length;
  const skippedCount = results.filter(r => r.status === "skipped").length;
  const totalTokens = results.reduce((s, r) => s + (r.tokens || 0), 0);
  const cost = (totalTokens / 1_000_000 * 15).toFixed(3);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--a-border)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "var(--a-text)" }}>
            {running ? (paused ? "Пауза" : "Генерація...") : "Завершено"}
          </span>
          <span className="text-xs tabular-nums" style={{ color: "var(--a-text-4)" }}>{pct}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--a-bg-input)" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: "#7c3aed" }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-px" style={{ background: "var(--a-border-sub)" }}>
        {[
          { l: "Оброблено", v: `${processed}/${total}`, c: "var(--a-text-2)" },
          { l: "Успішно", v: String(successCount), c: "#4ade80" },
          { l: "Пропущено", v: String(skippedCount), c: "var(--a-text-4)" },
          { l: "Помилки", v: String(errorCount), c: errorCount > 0 ? "#f87171" : "var(--a-text-4)" },
          { l: "Вартість", v: `$${cost}`, c: "#a78bfa" },
        ].map(s => (
          <div key={s.l} className="px-3 py-2.5" style={{ background: "var(--a-bg-card)" }}>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>{s.l}</p>
            <p className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: s.c }}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Results log */}
      {results.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto px-4 py-2" style={{ borderTop: "1px solid var(--a-border-sub)" }}>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] py-1" style={{ borderBottom: "1px solid var(--a-border-sub)" }}>
              <span style={{ color: r.status === "success" ? "#4ade80" : r.status === "error" ? "#f87171" : "var(--a-text-5)" }}>
                {r.status === "success" ? "✓" : r.status === "error" ? "✗" : "—"}
              </span>
              <span className="truncate flex-1" style={{ color: "var(--a-text-body)" }}>{r.name}</span>
              {r.error && <span className="shrink-0 text-[10px]" style={{ color: "#f87171" }}>{r.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderTop: "1px solid var(--a-border)" }}>
        {running ? (
          <>
            <button onClick={onPause} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}>
              {paused ? "▶ Продовжити" : "⏸ Пауза"}
            </button>
            <button onClick={onStop} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: "#f87171", background: "#1c1017", border: "1px solid #7f1d1d" }}>
              ⏹ Стоп
            </button>
          </>
        ) : (
          <>
            <span className="text-[11px]" style={{ color: "var(--a-text-5)" }}>
              Нічого не записано. Перегляньте і підтвердіть.
            </span>
            <div className="ml-auto flex gap-2">
              <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: "var(--a-text-4)" }}>
                Скасувати
              </button>
              <button onClick={onAcceptAll} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: "#166534" }}>
                ✅ Прийняти всі ({successCount})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
