"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Users,
  Eye,
  ShoppingCart,
  DollarSign,
  Search,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Globe,
  Package,
  MousePointerClick,
} from "lucide-react";

interface DashboardData {
  realtime: { activeUsers: number; lastUpdated: string };
  today: {
    pageViews: number;
    pageViewsChange: number;
    totalEvents: number;
    orders: number;
    revenue: number;
  };
  topPages: { path: string; count: number }[];
  topSearches: { query: string; count: number }[];
  devices: { desktop: number; mobile: number; tablet: number };
  recentEvents: {
    event_type: string;
    page_path: string | null;
    product_name: string | null;
    search_query: string | null;
    order_id: string | null;
    revenue: number | null;
    device_type: string | null;
    country: string | null;
    created_at: string;
  }[];
}

const EVENT_LABELS: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  page_view: { label: "Перегляд", icon: Eye, color: "text-blue-400" },
  view_item: { label: "Товар", icon: Package, color: "text-purple-400" },
  add_to_cart: { label: "Кошик", icon: ShoppingCart, color: "text-amber-400" },
  purchase: { label: "Покупка", icon: DollarSign, color: "text-emerald-400" },
  search: { label: "Пошук", icon: Search, color: "text-cyan-400" },
  begin_checkout: { label: "Checkout", icon: MousePointerClick, color: "text-pink-400" },
};

const PAGE_NAMES: Record<string, string> = {
  "/": "Головна",
  "/catalog": "Каталог",
  "/search": "Пошук",
  "/checkout": "Оформлення",
  "/checkout/success": "Замовлення оформлено",
  "/login": "Вхід",
  "/register": "Реєстрація",
  "/account": "Кабінет",
  "/account/orders": "Мої замовлення",
  "/wishlist": "Обране",
  "/brands": "Бренди",
  "/wholesale": "Опт",
  "/delivery": "Доставка",
  "/contacts": "Контакти",
  "/about": "Про нас",
  "/privacy": "Політика конфіденційності",
};

function friendlyPath(path: string): string {
  if (!path) return "—";
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  if (path.startsWith("/catalog/")) return "Каталог › " + decodeURIComponent(path.slice(9));
  if (path.startsWith("/product/")) return "Товар › " + decodeURIComponent(path.slice(9));
  if (path.startsWith("/admin")) return "Адмін › " + (path.slice(7) || "Dashboard");
  return path;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/dashboard");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("Не вдалося завантажити дані");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Авто-оновлення кожні 10 секунд
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin" style={{ color: "var(--a-text-3)" }} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 text-center text-red-400">{error}</div>
    );
  }

  const d = data!;
  const totalDevices = d.devices.desktop + d.devices.mobile + d.devices.tablet;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <BarChart3 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--a-text)" }}>Аналітика</h1>
            <p className="text-sm" style={{ color: "var(--a-text-2)" }}>Дані в реальному часі</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-400"
                : ""
            }`}
            style={!autoRefresh ? { background: "var(--a-bg-hover)", color: "var(--a-text-3)" } : undefined}
          >
            <Activity className={`h-3 w-3 ${autoRefresh ? "animate-pulse" : ""}`} />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}
          >
            <RefreshCw className="h-3 w-3" />
            Оновити
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Active Now */}
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--a-text-3)" }}>Зараз на сайті</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold" style={{ color: "var(--a-text)" }}>
              {d.realtime.activeUsers}
            </span>
            <span className="mb-1 flex items-center gap-0.5 text-xs text-emerald-400">
              <Activity className="h-3 w-3 animate-pulse" />
              live
            </span>
          </div>
        </div>

        {/* Page Views Today */}
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--a-text-3)" }}>Перегляди сьогодні</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
              <Eye className="h-3.5 w-3.5 text-blue-400" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold" style={{ color: "var(--a-text)" }}>
              {d.today.pageViews.toLocaleString()}
            </span>
            {d.today.pageViewsChange !== 0 && (
              <span
                className={`mb-1 flex items-center gap-0.5 text-xs ${
                  d.today.pageViewsChange > 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {d.today.pageViewsChange > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {d.today.pageViewsChange > 0 ? "+" : ""}
                {d.today.pageViewsChange}%
              </span>
            )}
          </div>
        </div>

        {/* Orders Today */}
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--a-text-3)" }}>Замовлення сьогодні</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
              <ShoppingCart className="h-3.5 w-3.5 text-amber-400" />
            </div>
          </div>
          <span className="text-3xl font-bold" style={{ color: "var(--a-text)" }}>{d.today.orders}</span>
        </div>

        {/* Revenue Today */}
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--a-text-3)" }}>Дохід сьогодні</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
          <span className="text-3xl font-bold" style={{ color: "var(--a-text)" }}>
            {d.today.revenue.toLocaleString("uk-UA")} ₴
          </span>
        </div>
      </div>

      {/* ── Middle row: Live Feed + Top Pages ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Live Feed */}
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--a-text)" }}>
            <Activity className="h-4 w-4 animate-pulse text-emerald-400" />
            Живий потік подій
          </h3>
          <div className="max-h-[340px] space-y-1 overflow-y-auto">
            {d.recentEvents.length === 0 ? (
              <p className="py-8 text-center text-xs" style={{ color: "var(--a-text-4)" }}>
                Поки немає подій. Відвідайте сайт щоб побачити дані.
              </p>
            ) : (
              d.recentEvents.map((event, i) => {
                const meta = EVENT_LABELS[event.event_type] || {
                  label: event.event_type,
                  icon: Globe,
                  color: "text-zinc-400",
                };
                const Icon = meta.icon;
                const time = new Date(event.created_at);
                const ago = getTimeAgo(time);

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors"
                    onMouseEnter={(ev) => { ev.currentTarget.style.background = "var(--a-bg-hover)"; }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                    <span className={`w-16 shrink-0 text-[10px] font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--a-text-2)" }}>
                      {event.product_name ||
                        event.search_query ||
                        event.order_id ||
                        friendlyPath(event.page_path || "") ||
                        "—"}
                    </span>
                    {event.revenue && (
                      <span className="shrink-0 text-[10px] font-bold text-emerald-400">
                        {Number(event.revenue).toLocaleString()} ₴
                      </span>
                    )}
                    <span className="w-12 shrink-0 text-right text-[10px]" style={{ color: "var(--a-text-4)" }}>
                      {ago}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Pages */}
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--a-text)" }}>
            Топ сторінки сьогодні
          </h3>
          <div className="space-y-1.5">
            {d.topPages.length === 0 ? (
              <p className="py-8 text-center text-xs" style={{ color: "var(--a-text-4)" }}>
                Немає даних
              </p>
            ) : (
              d.topPages.map((page, i) => (
                <div key={page.path} className="flex items-center gap-2">
                  <span className="w-5 text-right text-[10px] font-bold" style={{ color: "var(--a-text-4)" }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="relative h-6 overflow-hidden rounded" style={{ background: "var(--a-bg-hover)" }}>
                      <div
                        className="absolute inset-y-0 left-0 rounded bg-purple-500/15"
                        style={{
                          width: `${(page.count / (d.topPages[0]?.count || 1)) * 100}%`,
                        }}
                      />
                      <span className="relative flex h-full items-center px-2 text-xs" style={{ color: "var(--a-text-name)" }}>
                        {friendlyPath(page.path)}
                      </span>
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-medium" style={{ color: "var(--a-text-3)" }}>
                    {page.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Devices + Searches ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Devices */}
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--a-text)" }}>Пристрої</h3>
          {totalDevices === 0 ? (
            <p className="py-4 text-center text-xs" style={{ color: "var(--a-text-4)" }}>Немає даних</p>
          ) : (
            <div className="space-y-3">
              <DeviceRow
                icon={Monitor}
                label="Desktop"
                count={d.devices.desktop}
                total={totalDevices}
                color="bg-blue-500"
              />
              <DeviceRow
                icon={Smartphone}
                label="Mobile"
                count={d.devices.mobile}
                total={totalDevices}
                color="bg-purple-500"
              />
              <DeviceRow
                icon={Tablet}
                label="Tablet"
                count={d.devices.tablet}
                total={totalDevices}
                color="bg-amber-500"
              />
            </div>
          )}
        </div>

        {/* Top Searches */}
        <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--a-text)" }}>
            <Search className="h-4 w-4 text-cyan-400" />
            Популярні пошукові запити
          </h3>
          {d.topSearches.length === 0 ? (
            <p className="py-4 text-center text-xs" style={{ color: "var(--a-text-4)" }}>Немає пошукових запитів</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {d.topSearches.map((s) => (
                <span
                  key={s.query}
                  className="rounded-full px-2.5 py-1 text-xs"
                  style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}
                >
                  {s.query}
                  <span className="ml-1 text-[10px]" style={{ color: "var(--a-text-4)" }}>{s.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper Components ──

function DeviceRow({
  icon: Icon,
  label,
  count,
  total,
  color,
}: {
  icon: typeof Monitor;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--a-text-3)" }} />
      <span className="w-16 text-xs" style={{ color: "var(--a-text-2)" }}>{label}</span>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--a-border)" }}>
          <div
            className={`h-full rounded-full ${color} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="w-12 text-right text-xs" style={{ color: "var(--a-text-3)" }}>
        {pct}% ({count})
      </span>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}с`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}хв`;
  const hr = Math.floor(min / 60);
  return `${hr}год`;
}
