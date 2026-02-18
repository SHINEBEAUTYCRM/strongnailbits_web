"use client";

interface BulkStats {
  total: number;
  processed: number;
  success: number;
  skipped: number;
  errors: number;
  totalTokens: number;
  running: boolean;
  paused: boolean;
}

interface AiBulkProgressProps {
  stats: BulkStats;
  estimatedCost: string;
  onPause: () => void;
  onStop: () => void;
}

export function AiBulkProgress({ stats, estimatedCost, onPause, onStop }: AiBulkProgressProps) {
  const pct = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
  const costUsed = (stats.totalTokens / 1_000_000 * 15).toFixed(3);

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium" style={{ color: "var(--a-text)" }}>
          {stats.running ? "Генерація описів..." : stats.paused ? "Пауза" : "Завершено"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--a-bg-input)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: stats.errors > 0 ? "#f59e0b" : "#7c3aed" }}
        />
      </div>

      <div className="text-xs mb-3" style={{ color: "var(--a-text-3)" }}>{pct}%</div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <StatBox label="Оброблено" value={`${stats.processed} / ${stats.total}`} color="var(--a-text-2)" />
        <StatBox label="Згенеровано" value={String(stats.success)} color="#4ade80" />
        <StatBox label="Пропущено" value={String(stats.skipped)} color="var(--a-text-4)" />
        <StatBox label="Помилки" value={String(stats.errors)} color={stats.errors > 0 ? "#f87171" : "var(--a-text-4)"} />
        <StatBox label="Вартість" value={`$${costUsed} / ~${estimatedCost}`} color="#a78bfa" />
      </div>

      {/* Controls */}
      {stats.running && (
        <div className="flex gap-2">
          <button
            onClick={onPause}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}
          >
            {stats.paused ? "▶ Продовжити" : "⏸ Пауза"}
          </button>
          <button
            onClick={onStop}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: "#f87171", background: "#1c1017", border: "1px solid #7f1d1d" }}
          >
            ⏹ Зупинити
          </button>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: "var(--a-bg-input)" }}>
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--a-text-5)" }}>{label}</p>
      <p className="text-sm font-semibold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}
