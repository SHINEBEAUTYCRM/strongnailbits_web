"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone, Users, Eye, ShoppingCart, DollarSign, Search,
  Monitor, Smartphone, Tablet, TrendingUp, TrendingDown,
  RefreshCw, Activity, Globe, Package, MousePointerClick,
  BarChart3, Target, ArrowRight, ExternalLink,
} from "lucide-react";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Types ──
interface KPI { value: number | string; change?: number }
interface FunnelStep { step: string; count: number; color: string }
interface HourlyPoint { hour: string; views: number; events: number }
interface WeeklyPoint { date: string; label: string; views: number; sessions: number; orders: number; revenue: number }

interface MarketingData {
  activeUsers: number;
  kpi: Record<string, KPI>;
  funnel: FunnelStep[];
  hourlyChart: HourlyPoint[];
  weeklyTrend: WeeklyPoint[];
  topPages: { path: string; count: number }[];
  topProducts: { name: string; views: number; carts: number }[];
  topSearches: { query: string; count: number }[];
  trafficSources: { source: string; count: number }[];
  countries: { code: string; count: number }[];
  devices: Record<string, number>;
  recentEvents: any[];
}

const EVENT_META: Record<string, { label: string; icon: any; color: string }> = {
  page_view:      { label: "Перегляд",  icon: Eye,               color: "text-blue-400" },
  view_item:      { label: "Товар",     icon: Package,           color: "text-purple-400" },
  add_to_cart:    { label: "Кошик",     icon: ShoppingCart,       color: "text-amber-400" },
  purchase:       { label: "Покупка",   icon: DollarSign,        color: "text-emerald-400" },
  search:         { label: "Пошук",     icon: Search,            color: "text-cyan-400" },
  begin_checkout: { label: "Checkout",  icon: MousePointerClick,  color: "text-pink-400" },
};

/* Human-readable page names for paths */
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
  // /catalog/gel-laki → Каталог › gel-laki
  if (path.startsWith("/catalog/")) return "Каталог › " + decodeURIComponent(path.slice(9));
  // /product/baza-dark → Товар › baza-dark
  if (path.startsWith("/product/")) return "Товар › " + decodeURIComponent(path.slice(9));
  // /admin/... → Адмін › ...
  if (path.startsWith("/admin")) return "Адмін › " + (path.slice(7) || "Dashboard");
  return path;
}

export default function MarketingDashboard() {
  const [data, setData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch("/api/analytics/marketing");
      if (r.ok) { setData(await r.json()); }
    } catch (err) {
      console.error('[Marketing] Data fetch failed:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(fetch_, 15000);
    return () => clearInterval(id);
  }, [live, fetch_]);

  if (loading && !data) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <RefreshCw className="h-6 w-6 animate-spin" style={{ color: "var(--a-text-3)" }} />
    </div>
  );

  if (!data) return <div className="p-6 text-red-400">Помилка завантаження</div>;

  const d = data;
  const maxFunnel = Math.max(...d.funnel.map(f => f.count), 1);
  const maxHourly = Math.max(...d.hourlyChart.map(h => h.views), 1);
  const maxWeekly = Math.max(...d.weeklyTrend.map(w => w.views), 1);
  const totalDevices = d.devices.desktop + d.devices.mobile + d.devices.tablet;

  return (
    <div className="space-y-5 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <Megaphone className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--a-text)" }}>Marketing Dashboard</h1>
            <p className="text-sm" style={{ color: "var(--a-text-2)" }}>Всі дані в реальному часі</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLive(!live)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${live ? "bg-emerald-500/10 text-emerald-400" : "text-[var(--a-text-3)]"}`} style={!live ? { background: "var(--a-bg-hover)" } : undefined}>
            <Activity className={`h-3 w-3 ${live ? "animate-pulse" : ""}`} />
            {live ? "Live" : "Paused"}
          </button>
          <button onClick={fetch_} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs" style={{ background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}>
            <RefreshCw className="h-3 w-3" /> Оновити
          </button>
          <Link href="/admin/analytics" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs" style={{ background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}>
            <BarChart3 className="h-3 w-3" /> Деталі
          </Link>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard icon={Users} label="Онлайн" value={d.activeUsers} live />
        <KPICard icon={Eye} label="Сесії" value={d.kpi.sessions.value} change={d.kpi.sessions.change} />
        <KPICard icon={ShoppingCart} label="Замовлення" value={d.kpi.orders.value} change={d.kpi.orders.change} />
        <KPICard icon={DollarSign} label="Дохід" value={`${Number(d.kpi.revenue.value).toLocaleString("uk-UA")} ₴`} change={d.kpi.revenue.change} />
        <KPICard icon={Target} label="Конверсія" value={`${d.kpi.conversion.value}%`} />
        <KPICard icon={DollarSign} label="Сер. чек" value={`${Number(d.kpi.avgCheck.value).toLocaleString("uk-UA")} ₴`} />
      </div>

      {/* ── Funnel ── */}
      <Card title="Воронка конверсії" icon={Target}>
        <div className="flex items-end gap-1">
          {d.funnel.map((f, i) => (
            <div key={f.step} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: "var(--a-text)" }}>{f.count}</span>
              <div className="relative w-full overflow-hidden rounded-t-md" style={{ height: `${Math.max((f.count / maxFunnel) * 120, 8)}px`, background: f.color, opacity: 0.8 }} />
              <span className="text-[10px]" style={{ color: "var(--a-text-3)" }}>{f.step}</span>
              {i < d.funnel.length - 1 && f.count > 0 && d.funnel[i + 1].count > 0 && (
                <span className="absolute -right-3 top-1/2 text-[9px]" style={{ color: "var(--a-text-4)" }}>
                  {Math.round((d.funnel[i + 1].count / f.count) * 100)}%
                </span>
              )}
            </div>
          ))}
        </div>
        {d.funnel[0].count > 0 && d.funnel[d.funnel.length - 1].count > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: "var(--a-text-3)" }}>
            <ArrowRight className="h-3 w-3" />
            Загальна конверсія: <span className="font-medium text-emerald-400">{((d.funnel[d.funnel.length - 1].count / d.funnel[0].count) * 100).toFixed(1)}%</span>
          </div>
        )}
      </Card>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hourly */}
        <Card title="Перегляди по годинах (сьогодні)" icon={BarChart3}>
          <div className="flex items-end gap-[2px]" style={{ height: 100 }}>
            {d.hourlyChart.map((h) => (
              <div key={h.hour} className="group relative flex-1" title={`${h.hour}: ${h.views} переглядів`}>
                <div
                  className="w-full rounded-t bg-indigo-500/60 transition-colors hover:bg-indigo-400/80"
                  style={{ height: `${Math.max((h.views / maxHourly) * 100, 2)}%` }}
                />
                <div className="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] group-hover:block" style={{ background: "var(--a-bg-hover)", color: "var(--a-text)" }}>
                  {h.hour} — {h.views}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px]" style={{ color: "var(--a-text-4)" }}>
            <span>0:00</span><span>{now_hour()}:00</span>
          </div>
        </Card>

        {/* Weekly trend */}
        <Card title="Тренд за 7 днів" icon={TrendingUp}>
          <div className="flex items-end gap-1" style={{ height: 100 }}>
            {d.weeklyTrend.map((w) => (
              <div key={w.date} className="group relative flex-1" title={`${w.label}: ${w.views} переглядів, ${w.orders} замовлень`}>
                <div
                  className="w-full rounded-t bg-purple-500/60 transition-colors hover:bg-purple-400/80"
                  style={{ height: `${Math.max((w.views / maxWeekly) * 100, 2)}%` }}
                />
                <div className="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] group-hover:block" style={{ background: "var(--a-bg-hover)", color: "var(--a-text)" }}>
                  {w.label}: {w.views} / {w.orders} зам.
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px]" style={{ color: "var(--a-text-4)" }}>
            {d.weeklyTrend.map((w) => <span key={w.date}>{w.label}</span>)}
          </div>
        </Card>
      </div>

      {/* ── Middle: Top Products + Live Feed ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Products */}
        <Card title="Топ товари" icon={Package}>
          {d.topProducts.length === 0 ? <Empty /> : (
            <div className="space-y-1.5">
              {d.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right font-bold" style={{ color: "var(--a-text-4)" }}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate" style={{ color: "var(--a-text-name)" }}>{p.name}</span>
                  <span className="flex items-center gap-1" style={{ color: "var(--a-text-3)" }}>
                    <Eye className="h-3 w-3" />{p.views}
                  </span>
                  <span className="flex items-center gap-1 text-amber-400/80">
                    <ShoppingCart className="h-3 w-3" />{p.carts}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Live Feed */}
        <Card title="Живий потік" icon={Activity} titleExtra={<span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}>
          <div className="max-h-[260px] space-y-0.5 overflow-y-auto">
            {d.recentEvents.length === 0 ? <Empty text="Очікуємо перших подій..." /> : (
              d.recentEvents.map((e: any, i: number) => {
                const m = EVENT_META[e.event_type] || { label: e.event_type, icon: Globe, color: "text-zinc-400" };
                const Icon = m.icon;
                return (
                  <div key={i} className="flex items-center gap-2 rounded px-1.5 py-1" style={{ cursor: "default" }}
                    onMouseEnter={(ev) => { ev.currentTarget.style.background = "var(--a-bg-hover)"; }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}>
                    <Icon className={`h-3 w-3 shrink-0 ${m.color}`} />
                    <span className={`w-14 shrink-0 text-[10px] font-medium ${m.color}`}>{m.label}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: "var(--a-text-2)" }}>
                      {e.product_name || e.search_query || e.order_id || friendlyPath(e.page_path) || "—"}
                    </span>
                    {e.revenue && <span className="text-[10px] font-bold text-emerald-400">{Number(e.revenue).toLocaleString()} ₴</span>}
                    <span className="w-10 text-right text-[9px]" style={{ color: "var(--a-text-4)" }}>{timeAgo(e.created_at)}</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ── Bottom: Pages, Searches, Sources, Devices, Countries ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Pages */}
        <Card title="Топ сторінки" icon={Eye}>
          {d.topPages.length === 0 ? <Empty /> : (
            <div className="space-y-1">
              {d.topPages.map((p, i) => (
                <div key={p.path} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right font-bold" style={{ color: "var(--a-text-4)" }}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="relative h-5 overflow-hidden rounded" style={{ background: "var(--a-bg-hover)" }}>
                      <div className="absolute inset-y-0 left-0 rounded bg-indigo-500/15" style={{ width: `${(p.count / (d.topPages[0]?.count || 1)) * 100}%` }} />
                      <span className="relative flex h-full items-center px-1.5 text-[11px]" style={{ color: "var(--a-text-2)" }}>{friendlyPath(p.path)}</span>
                    </div>
                  </div>
                  <span className="w-8 text-right" style={{ color: "var(--a-text-3)" }}>{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Searches */}
        <Card title="Пошукові запити" icon={Search}>
          {d.topSearches.length === 0 ? <Empty text="Немає пошуків" /> : (
            <div className="flex flex-wrap gap-1.5">
              {d.topSearches.map((s) => (
                <span key={s.query} className="rounded-full px-2.5 py-1 text-xs" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}>
                  {s.query} <span className="text-[10px]" style={{ color: "var(--a-text-4)" }}>{s.count}</span>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Traffic Sources + Devices + Countries */}
        <Card title="Джерела та пристрої" icon={Globe}>
          {/* Sources */}
          {d.trafficSources.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-4)" }}>Джерела</p>
              <div className="space-y-1">
                {d.trafficSources.slice(0, 5).map((s) => (
                  <div key={s.source} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5" style={{ color: "var(--a-text-2)" }}>
                      <ExternalLink className="h-3 w-3" style={{ color: "var(--a-text-4)" }} />{s.source}
                    </span>
                    <span style={{ color: "var(--a-text-3)" }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Devices */}
          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-4)" }}>Пристрої</p>
            {totalDevices === 0 ? <Empty text="" /> : (
              <div className="space-y-1.5">
                {[
                  { icon: Monitor, label: "Desktop", count: d.devices.desktop, color: "bg-blue-500" },
                  { icon: Smartphone, label: "Mobile", count: d.devices.mobile, color: "bg-purple-500" },
                  { icon: Tablet, label: "Tablet", count: d.devices.tablet, color: "bg-amber-500" },
                ].map(({ icon: I, label, count, color }) => {
                  const pct = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0;
                  return (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <I className="h-3 w-3" style={{ color: "var(--a-text-3)" }} />
                      <span className="w-14" style={{ color: "var(--a-text-2)" }}>{label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--a-border)" }}>
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-12 text-right" style={{ color: "var(--a-text-3)" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Countries */}
          {d.countries.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-4)" }}>Країни</p>
              <div className="flex flex-wrap gap-1">
                {d.countries.map((c) => (
                  <span key={c.code} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}>
                    {c.code} <span style={{ color: "var(--a-text-4)" }}>{c.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Reusable Components ──

function Card({ title, icon: Icon, children, titleExtra }: { title: string; icon: any; children: React.ReactNode; titleExtra?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--a-text)" }}>
        <Icon className="h-4 w-4 text-purple-400" />
        {title}
        {titleExtra}
      </h3>
      {children}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, change, live: isLive }: { icon: any; label: string; value: number | string; change?: number; live?: boolean }) {
  return (
    <div className="rounded-xl p-3" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>{label}</span>
        <Icon className="h-3.5 w-3.5" style={{ color: "var(--a-text-4)" }} />
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-xl font-bold" style={{ color: "var(--a-text)" }}>{value}</span>
        {isLive && <Activity className="mb-0.5 h-3 w-3 animate-pulse text-emerald-400" />}
        {change !== undefined && change !== 0 && (
          <span className={`mb-0.5 flex items-center gap-0.5 text-[10px] ${change > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {change > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {change > 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>
    </div>
  );
}

function Empty({ text = "Немає даних" }: { text?: string }) {
  return <p className="py-4 text-center text-xs" style={{ color: "var(--a-text-4)" }}>{text}</p>;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}с`;
  if (s < 3600) return `${Math.floor(s / 60)}хв`;
  return `${Math.floor(s / 3600)}год`;
}

function now_hour() {
  return new Date().getHours();
}
