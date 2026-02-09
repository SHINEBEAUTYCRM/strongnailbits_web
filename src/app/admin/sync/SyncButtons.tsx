"use client";

import { useState } from "react";
import { RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";

const SYNC_ENDPOINTS = [
  { key: "categories", label: "Категорії", path: "/api/sync/categories" },
  { key: "brands", label: "Бренди", path: "/api/sync/brands" },
  { key: "products", label: "Товари", path: "/api/sync/products" },
  { key: "link-brands", label: "Зв'язати бренди", path: "/api/sync/link-brands" },
];

export function SyncButtons() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const runSync = async (key: string, path: string) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    setResults((prev) => ({ ...prev, [key]: undefined as unknown as { ok: boolean; message: string } }));

    try {
      const res = await fetch(path, {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}` },
      });
      const data = await res.json().catch(() => ({}));
      setResults((prev) => ({
        ...prev,
        [key]: { ok: res.ok, message: res.ok ? `Успішно: ${JSON.stringify(data).slice(0, 100)}` : data.error || "Помилка" },
      }));
    } catch (err) {
      setResults((prev) => ({ ...prev, [key]: { ok: false, message: "Network error" } }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const runAll = async () => {
    for (const ep of SYNC_ENDPOINTS) {
      await runSync(ep.key, ep.path);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {SYNC_ENDPOINTS.map((ep) => (
          <button
            key={ep.key}
            onClick={() => runSync(ep.key, ep.path)}
            disabled={loading[ep.key]}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all duration-150 disabled:opacity-50"
          >
            {loading[ep.key] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {ep.label}
          </button>
        ))}

        <button
          onClick={runAll}
          disabled={Object.values(loading).some(Boolean)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-all duration-150 disabled:opacity-50"
        >
          {Object.values(loading).some(Boolean) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Синхронізувати все
        </button>
      </div>

      {/* Results */}
      {Object.keys(results).filter((k) => results[k]).length > 0 && (
        <div className="space-y-2">
          {SYNC_ENDPOINTS.map((ep) => {
            const r = results[ep.key];
            if (!r) return null;
            return (
              <div key={ep.key} className={`flex items-start gap-2 px-4 py-2.5 rounded-xl text-xs ${r.ok ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                {r.ok ? <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />}
                <div>
                  <span className={`font-medium ${r.ok ? "text-green-400" : "text-red-400"}`}>{ep.label}:</span>{" "}
                  <span className="text-white/50">{r.message}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
