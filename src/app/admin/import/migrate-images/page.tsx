"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ImageIcon,
  Play,
  Pause,
  Square,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
} from "lucide-react";

interface MigrationProgress {
  status: "idle" | "running" | "paused" | "completed" | "failed";
  total_products: number;
  processed_products: number;
  total_images: number;
  processed_images: number;
  failed_images: number;
  size_bytes: number;
  started_at: string | null;
  last_product_id: string | null;
  errors: Array<{ product_id: string; url: string; error: string }>;
}

interface MigrationStats {
  external_images: number;
  migrated_images: number;
  total_with_images: number;
}

export default function MigrateImagesPage() {
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/import/migrate-images");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProgress(json.progress);
      setStats(json.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження статусу");
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling when running
  useEffect(() => {
    if (progress?.status === "running") {
      pollingRef.current = setInterval(fetchStatus, 5000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [progress?.status, fetchStatus]);

  const sendAction = async (action: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import/migrate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    }
    setLoading(false);
  };

  const percent = progress && progress.total_products > 0
    ? Math.round((progress.processed_products / progress.total_products) * 100)
    : 0;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatElapsed = (startedAt: string | null) => {
    if (!startedAt) return "—";
    const elapsed = Date.now() - new Date(startedAt).getTime();
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const estimateRemaining = () => {
    if (!progress?.started_at || progress.processed_products === 0) return "—";
    const elapsed = Date.now() - new Date(progress.started_at).getTime();
    const perProduct = elapsed / progress.processed_products;
    const remaining = perProduct * (progress.total_products - progress.processed_products);
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    return `~${hours > 0 ? `${hours}г ` : ""}${minutes}хв`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/import"
          className="flex items-center gap-1 text-sm"
          style={{ color: "var(--a-text-4)" }}>
          <ArrowLeft className="w-4 h-4" />
          Імпорт
        </Link>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3" style={{ color: "var(--a-text)" }}>
            <ImageIcon className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
            Міграція фото в Storage
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--a-text-4)" }}>
            Переміщення фото з CS-Cart сервера в Supabase Storage
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
          style={{ background: "#450a0a", border: "1px solid #f8717140", color: "#f87171" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Фото на strongnailbits.com.ua"
            value={stats.external_images.toLocaleString("uk-UA")}
            sublabel="Потрібна міграція"
            color="#f87171"
          />
          <StatCard
            label="Вже мігровано"
            value={stats.migrated_images.toLocaleString("uk-UA")}
            sublabel="В Supabase Storage"
            color="#4ade80"
          />
          <StatCard
            label="Всього з фото"
            value={stats.total_with_images.toLocaleString("uk-UA")}
            sublabel="Товарів"
            color="#60a5fa"
          />
        </div>
      )}

      {/* Migration progress card */}
      <div className="rounded-2xl p-6 mb-6"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--a-text)" }}>
            Прогрес міграції
          </h2>
          <StatusBadge status={progress?.status ?? "idle"} />
        </div>

        {/* Progress bar */}
        {progress && progress.status !== "idle" && (
          <>
            <div className="relative h-6 rounded-full overflow-hidden mb-3"
              style={{ background: "var(--a-bg-input)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${percent}%`,
                  background: progress.status === "completed"
                    ? "linear-gradient(90deg, #4ade80, #22c55e)"
                    : progress.status === "failed"
                      ? "linear-gradient(90deg, #f87171, #ef4444)"
                      : "linear-gradient(90deg, #7c3aed, #a855f7)",
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                style={{ color: "var(--a-text-2)" }}>
                {percent}%
              </span>
            </div>

            {/* Detailed stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <MiniStat label="Товарів" value={`${progress.processed_products.toLocaleString("uk-UA")} / ${progress.total_products.toLocaleString("uk-UA")}`} />
              <MiniStat label="Фото" value={`${progress.processed_images.toLocaleString("uk-UA")} / ${progress.total_images > 0 ? `~${progress.total_images.toLocaleString("uk-UA")}` : "?"}`} />
              <MiniStat label="Розмір" value={formatBytes(progress.size_bytes)} />
              <MiniStat label="Помилки" value={String(progress.failed_images)} isError={progress.failed_images > 0} />
            </div>

            <div className="flex items-center gap-4 text-xs mb-4" style={{ color: "var(--a-text-4)" }}>
              <span>Час: {formatElapsed(progress.started_at)}</span>
              {progress.status === "running" && (
                <span>Залишилось: {estimateRemaining()}</span>
              )}
            </div>
          </>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          {(!progress || progress.status === "idle" || progress.status === "completed" || progress.status === "failed") && (
            <button
              onClick={() => sendAction("start")}
              disabled={loading || (stats?.external_images ?? 0) === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {progress?.status === "completed" ? "Запустити знову" : "Запустити міграцію"}
            </button>
          )}

          {progress?.status === "running" && (
            <>
              <button
                onClick={() => sendAction("pause")}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: "#422006", color: "#fbbf24", border: "1px solid #fbbf2440" }}
              >
                <Pause className="w-4 h-4" />
                Пауза
              </button>
              <button
                onClick={() => sendAction("stop")}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: "#450a0a", color: "#f87171", border: "1px solid #f8717140" }}
              >
                <Square className="w-4 h-4" />
                Зупинити
              </button>
            </>
          )}

          {progress?.status === "paused" && (
            <button
              onClick={() => sendAction("resume")}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Продовжити
            </button>
          )}

          <button
            onClick={fetchStatus}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error log */}
      {progress && progress.errors.length > 0 && (
        <div className="rounded-2xl p-6"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", boxShadow: "var(--a-card-shadow)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--a-text)" }}>
            Помилки ({progress.errors.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                  <th className="text-left px-3 py-2" style={{ color: "var(--a-text-4)" }}>ID товару</th>
                  <th className="text-left px-3 py-2" style={{ color: "var(--a-text-4)" }}>URL</th>
                  <th className="text-left px-3 py-2" style={{ color: "var(--a-text-4)" }}>Помилка</th>
                </tr>
              </thead>
              <tbody>
                {progress.errors.slice(0, 50).map((err, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--a-border-sub)" }}>
                    <td className="px-3 py-2 font-mono" style={{ color: "var(--a-text-3)" }}>{err.product_id.slice(0, 8)}...</td>
                    <td className="px-3 py-2 max-w-[300px] truncate" style={{ color: "var(--a-text-3)" }}>{err.url}</td>
                    <td className="px-3 py-2" style={{ color: "#f87171" }}>{err.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function StatCard({ label, value, sublabel, color }: { label: string; value: string; sublabel: string; color: string }) {
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs font-medium mt-0.5" style={{ color: "var(--a-text-2)" }}>{label}</p>
      <p className="text-[10px] mt-0.5" style={{ color: "var(--a-text-4)" }}>{sublabel}</p>
    </div>
  );
}

function MiniStat({ label, value, isError }: { label: string; value: string; isError?: boolean }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "var(--a-bg-input)" }}>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>{label}</p>
      <p className="text-sm font-medium tabular-nums" style={{ color: isError ? "#f87171" : "var(--a-text-2)" }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    idle: { label: "Очікування", color: "var(--a-text-4)", bg: "var(--a-bg-input)" },
    running: { label: "Виконується", color: "#a855f7", bg: "#7c3aed20" },
    paused: { label: "Пауза", color: "#fbbf24", bg: "#42200620" },
    completed: { label: "Завершено", color: "#4ade80", bg: "#052e1640" },
    failed: { label: "Помилка", color: "#f87171", bg: "#450a0a40" },
  };

  const c = config[status] ?? config.idle;

  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ color: c.color, background: c.bg }}>
      {status === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === "completed" && <Check className="w-3 h-3" />}
      {status === "failed" && <AlertTriangle className="w-3 h-3" />}
      {c.label}
    </span>
  );
}
