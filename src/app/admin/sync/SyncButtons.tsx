"use client";
import { useState } from "react";
import { RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";

const ENTITIES = [
  { key: "categories", label: "Категорії" },
  { key: "brands", label: "Бренди" },
  { key: "products", label: "Товари" },
  { key: "link-brands", label: "Зв'язати бренди" },
];

export function SyncButtons() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const run = async (key: string) => {
    setLoading((p) => ({ ...p, [key]: true }));
    setResults((p) => { const n = { ...p }; delete n[key]; return n; });
    try {
      const r = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: key }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        const res = d.result;
        const msg = res
          ? `Оброблено: ${res.items_processed ?? "?"}, створено: ${res.items_created ?? 0}, оновлено: ${res.items_updated ?? 0}, помилок: ${res.items_failed ?? 0}`
          : "Успішно";
        setResults((p) => ({ ...p, [key]: { ok: true, message: msg } }));
      } else {
        setResults((p) => ({ ...p, [key]: { ok: false, message: d.error || "Помилка" } }));
      }
    } catch {
      setResults((p) => ({ ...p, [key]: { ok: false, message: "Network error" } }));
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const runAll = async () => {
    for (const e of ENTITIES) await run(e.key);
  };

  const anyLoading = Object.values(loading).some(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {ENTITIES.map((e) => (
          <button
            key={e.key}
            onClick={() => run(e.key)}
            disabled={loading[e.key]}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            style={{ background: "#111116", color: "#a1a1aa", border: "1px solid #1e1e2a" }}
          >
            {loading[e.key] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {e.label}
          </button>
        ))}
        <button
          onClick={runAll}
          disabled={anyLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "#7c3aed" }}
        >
          {anyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Синхронізувати все
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="space-y-2">
          {ENTITIES.map((e) => {
            const r = results[e.key];
            if (!r) return null;
            return (
              <div
                key={e.key}
                className="flex items-start gap-2 px-4 py-2.5 rounded-xl text-xs"
                style={r.ok ? { background: "#052e16", border: "1px solid #14532d" } : { background: "#450a0a", border: "1px solid #7f1d1d" }}
              >
                {r.ok ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#4ade80" }} /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#f87171" }} />}
                <div>
                  <span className="font-medium" style={{ color: r.ok ? "#4ade80" : "#f87171" }}>{e.label}:</span>{" "}
                  <span style={{ color: "#71717a" }}>{r.message}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
