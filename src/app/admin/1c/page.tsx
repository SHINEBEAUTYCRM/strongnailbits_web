"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Package, Users, ShoppingBag, FileText,
  Star, DollarSign, AlertTriangle, CheckCircle, XCircle,
  Loader2, Clock, Activity, ArrowUpRight, ArrowDownLeft,
  Zap,
} from "lucide-react";
import { ApiBreadcrumb } from "@/components/admin/ApiBreadcrumb";

interface Stats {
  overview: {
    requests_24h: number;
    requests_7d: number;
    errors_24h: number;
    error_rate_24h: number;
  };
  entities: {
    products_synced: number;
    customers_synced: number;
    orders_not_synced: number;
    documents: number;
    bonuses: number;
    customer_prices: number;
  };
  last_sync: {
    products: { created_at: string; status_code: number } | null;
    customers: { created_at: string; status_code: number } | null;
    orders: { created_at: string; status_code: number } | null;
  };
  recent_requests: Array<{
    id: string;
    method: string;
    endpoint: string;
    status_code: number;
    response_time_ms: number;
    error_message: string | null;
    created_at: string;
  }>;
  recent_errors: Array<{
    id: string;
    method: string;
    endpoint: string;
    status_code: number;
    error_message: string | null;
    created_at: string;
  }>;
}

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60000) return "щойно";
  if (ms < 3600000) return `${Math.floor(ms / 60000)} хв тому`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} год тому`;
  return `${Math.floor(ms / 86400000)} дн тому`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const METHOD_COLORS: Record<string, string> = {
  GET: "#60a5fa",
  POST: "#4ade80",
  PATCH: "#fbbf24",
  DELETE: "#f87171",
};

export default function Admin1CPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/1c-stats");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStats(data);
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--a-accent)" }} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "#450a0a", border: "1px solid #7f1d1d" }}>
        <p style={{ color: "#f87171" }}>{error || "Помилка завантаження"}</p>
      </div>
    );
  }

  const { overview, entities, last_sync, recent_requests, recent_errors } = stats;

  return (
    <div>
      <ApiBreadcrumb current="Монітор 1С" icon={Activity} />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3" style={{ color: "var(--a-text)" }}>
            <Activity className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
            Моніторинг 1С
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--a-text-4)" }}>Запити, помилки, синхронізовані сутності. Оновлюється в реальному часі.</p>
        </div>
        <button onClick={() => { setLoading(true); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text-2)" }}>
          <RefreshCw className="w-4 h-4" /> Оновити
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Activity} label="Запитів 24г" value={overview.requests_24h} color="#a855f7" />
        <StatCard icon={Activity} label="Запитів 7д" value={overview.requests_7d} color="#60a5fa" />
        <StatCard icon={AlertTriangle} label="Помилок 24г" value={overview.errors_24h} color={overview.errors_24h > 0 ? "#f87171" : "#4ade80"} />
        <StatCard icon={AlertTriangle} label="% помилок" value={`${overview.error_rate_24h}%`}
          color={overview.error_rate_24h > 10 ? "#f87171" : overview.error_rate_24h > 5 ? "#fbbf24" : "#4ade80"} />
      </div>

      {/* Sync status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Entity counts */}
        <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--a-text-3)" }}>Дані в системі</h3>
          <div className="space-y-3">
            <EntityRow icon={Package} label="Товарів з 1С" value={entities.products_synced} dir="in" />
            <EntityRow icon={Users} label="Клієнтів з 1С" value={entities.customers_synced} dir="in" />
            <EntityRow icon={ShoppingBag} label="Замовлень не синхр." value={entities.orders_not_synced}
              dir="out" warn={entities.orders_not_synced > 0} />
            <EntityRow icon={FileText} label="Документів" value={entities.documents} dir="in" />
            <EntityRow icon={Star} label="Бонусних операцій" value={entities.bonuses} dir="both" />
            <EntityRow icon={DollarSign} label="B2B цін" value={entities.customer_prices} dir="in" />
          </div>
        </div>

        {/* Last sync times */}
        <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--a-text-3)" }}>Остання синхронізація</h3>
          <div className="space-y-4">
            <SyncRow label="Товари" endpoint="POST /products" data={last_sync.products} />
            <SyncRow label="Клієнти" endpoint="POST /customers" data={last_sync.customers} />
            <SyncRow label="Замовлення" endpoint="GET /orders/new" data={last_sync.orders} />
          </div>

          {!last_sync.products && !last_sync.customers && !last_sync.orders && (
            <div className="text-center py-6">
              <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--a-text-5)" }} />
              <p className="text-sm" style={{ color: "var(--a-text-5)" }}>Синхронізація ще не запускалась</p>
              <p className="text-xs mt-1" style={{ color: "var(--a-text-6)" }}>Передайте ТЗ та API-токен програмісту 1С</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent errors */}
      {recent_errors.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: "#1a0a0a", border: "1px solid #7f1d1d" }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #7f1d1d" }}>
            <AlertTriangle className="w-4 h-4" style={{ color: "#f87171" }} />
            <h3 className="text-sm font-medium" style={{ color: "#f87171" }}>Останні помилки</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #450a0a" }}>
                  <th className="text-left px-4 py-2 text-[10px] uppercase" style={{ color: "#7f1d1d" }}>Час</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase" style={{ color: "#7f1d1d" }}>Ендпоінт</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase" style={{ color: "#7f1d1d" }}>Код</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase" style={{ color: "#7f1d1d" }}>Помилка</th>
                </tr>
              </thead>
              <tbody>
                {recent_errors.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #2a0a0a" }}>
                    <td className="px-4 py-2 text-xs whitespace-nowrap" style={{ color: "var(--a-text-2)" }}>{fmtDate(e.created_at)}</td>
                    <td className="px-4 py-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: METHOD_COLORS[e.method] || "var(--a-text-2)", background: "var(--a-bg-input)" }}>
                        {e.method}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "var(--a-text-name)" }}>{e.endpoint}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-xs font-mono" style={{ color: "#f87171" }}>{e.status_code}</span>
                    </td>
                    <td className="px-4 py-2 text-xs max-w-[300px] truncate" style={{ color: "#fca5a5" }}>{e.error_message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent requests */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--a-border)" }}>
          <h3 className="text-sm font-medium" style={{ color: "var(--a-text-3)" }}>Останні запити</h3>
        </div>
        {recent_requests.length === 0 ? (
          <div className="px-4 py-12 text-center" style={{ color: "var(--a-text-5)" }}>
            Запитів ще не було
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                  <th className="text-left px-4 py-2 text-[10px] uppercase" style={{ color: "var(--a-text-5)" }}>Час</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase" style={{ color: "var(--a-text-5)" }}>Ендпоінт</th>
                  <th className="text-center px-4 py-2 text-[10px] uppercase" style={{ color: "var(--a-text-5)" }}>Статус</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase" style={{ color: "var(--a-text-5)" }}>Час відп.</th>
                </tr>
              </thead>
              <tbody>
                {recent_requests.map((r) => (
                  <tr key={r.id} className="transition-colors" style={{ borderBottom: "1px solid var(--a-border)" }}
                    onMouseEnter={(ev) => { ev.currentTarget.style.background = "var(--a-bg-hover)"; }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}>
                    <td className="px-4 py-2 text-xs whitespace-nowrap" style={{ color: "var(--a-text-2)" }}>{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: METHOD_COLORS[r.method] || "var(--a-text-2)", background: "var(--a-bg-input)" }}>
                        {r.method}
                      </span>
                      <span className="text-xs ml-2" style={{ color: "var(--a-text-name)" }}>{r.endpoint}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                        style={r.status_code < 400
                          ? { color: "#4ade80", background: "#052e16" }
                          : { color: "#f87171", background: "#450a0a" }}>
                        {r.status_code}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-mono" style={{ color: "var(--a-text-3)" }}>
                      {r.response_time_ms ? `${r.response_time_ms}ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--a-text-4)" }}>{label}</span>
      </div>
      <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

function EntityRow({ icon: Icon, label, value, dir, warn }: { icon: typeof Package; label: string; value: number; dir: "in" | "out" | "both"; warn?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 shrink-0" style={{ color: warn ? "#fbbf24" : "var(--a-text-4)" }} />
      <span className="text-sm flex-1" style={{ color: "var(--a-text-2)" }}>{label}</span>
      {dir === "in" && <ArrowDownLeft className="w-3 h-3" style={{ color: "#4ade80" }} />}
      {dir === "out" && <ArrowUpRight className="w-3 h-3" style={{ color: "#60a5fa" }} />}
      {dir === "both" && <RefreshCw className="w-3 h-3" style={{ color: "var(--a-accent)" }} />}
      <span className="text-sm font-medium tabular-nums" style={{ color: warn ? "#fbbf24" : "var(--a-text-body)" }}>{value}</span>
    </div>
  );
}

function SyncRow({ label, endpoint, data }: { label: string; endpoint: string; data: { created_at: string; status_code: number } | null }) {
  if (!data) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: "var(--a-text-2)" }}>{label}</p>
          <p className="text-[10px] font-mono" style={{ color: "var(--a-text-5)" }}>{endpoint}</p>
        </div>
        <span className="text-xs" style={{ color: "var(--a-text-5)" }}>Ніколи</span>
      </div>
    );
  }

  const ok = data.status_code < 400;

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm flex items-center gap-2" style={{ color: "var(--a-text-2)" }}>
          {label}
          {ok ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "#4ade80" }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: "#f87171" }} />}
        </p>
        <p className="text-[10px] font-mono" style={{ color: "var(--a-text-5)" }}>{endpoint}</p>
      </div>
      <span className="text-xs" style={{ color: ok ? "var(--a-text-3)" : "#f87171" }}>{timeAgo(data.created_at)}</span>
    </div>
  );
}
