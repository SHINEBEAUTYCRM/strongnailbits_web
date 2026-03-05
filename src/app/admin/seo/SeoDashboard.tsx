"use client";

import { useState, useCallback } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Globe,
  Eye,
  MousePointerClick,
  BarChart3,
  ChevronRight,
  Link2,
  Settings,
} from "lucide-react";

// ─── Types ───
interface DomainInfo {
  domain: string;
  visible: number;
  keywords: number;
  traff: number;
  visible_dynamic: number;
  keywords_dynamic: number;
  traff_dynamic: number;
  new_keywords: number;
  out_keywords: number;
  rised_keywords: number;
  down_keywords: number;
  ad_keywords: number;
  ads: number;
  prev_date: string;
}

interface DomainKeyword {
  keyword: string;
  position: number;
  url: string;
  region_queries_count: number;
  traff: number;
  cost: number;
  concurrency: number;
  difficulty: number | null;
  dynamic: number;
}

interface Competitor {
  domain: string;
  keywords: number;
  visible: number;
  intersection: number;
}

interface TopUrl {
  url: string;
  keywords: number;
}

type Tab = "overview" | "keywords" | "competitors" | "pages";

const DOMAIN = "strongnailbitsb2b.com";
const SE = "g_ua"; // Google Ukraine
const COMPETITOR_DOMAINS = [
  "amoreshopping.com",
  "taki-taki.com.ua",
  "nailsmania.ua",
  "nailcomfort.com.ua",
  "krasotkapro.ua",
];

const TABS: { key: Tab; label: string; icon: typeof Search }[] = [
  { key: "overview", label: "Огляд", icon: BarChart3 },
  { key: "keywords", label: "Ключові слова", icon: Search },
  { key: "competitors", label: "Конкуренти", icon: Users },
  { key: "pages", label: "Топ сторінки", icon: FileText },
];

// ─── Helper: Serpstat API call ───
async function serpstatCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/admin/serpstat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result as T;
}

// ─── Formatters ───
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("uk-UA");
}

function fmtDynamic(n: number): { text: string; color: string; Icon: typeof TrendingUp } {
  if (n > 0) return { text: `+${fmtNum(n)}`, color: "#22c55e", Icon: TrendingUp };
  if (n < 0) return { text: fmtNum(n), color: "#ef4444", Icon: TrendingDown };
  return { text: "0", color: "#71717a", Icon: Minus };
}

function posDynamic(d: number) {
  if (d > 0) return { text: `+${d}`, color: "#ef4444", Icon: ArrowDownRight }; // позиція впала = погано
  if (d < 0) return { text: `${d}`, color: "#22c55e", Icon: ArrowUpRight }; // позиція зросла = добре
  return { text: "—", color: "#71717a", Icon: Minus };
}

// ════════════════════════════════════════════════════════
//  SEO Dashboard
// ════════════════════════════════════════════════════════
export function SeoDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [domainInfo, setDomainInfo] = useState<DomainInfo[] | null>(null);
  const [keywords, setKeywords] = useState<DomainKeyword[] | null>(null);
  const [keywordsTotal, setKeywordsTotal] = useState(0);
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null);
  const [topUrls, setTopUrls] = useState<TopUrl[] | null>(null);

  // ─── Load Overview ───
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await serpstatCall<{ data: DomainInfo[] }>(
        "SerpstatDomainProcedure.getDomainsInfo",
        { domains: [DOMAIN, ...COMPETITOR_DOMAINS], se: SE },
      );
      setDomainInfo(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    }
    setLoading(false);
  }, []);

  // ─── Load Keywords ───
  const loadKeywords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await serpstatCall<{ data: DomainKeyword[]; summary_info: { total: number } }>(
        "SerpstatDomainProcedure.getDomainKeywords",
        {
          domain: DOMAIN,
          se: SE,
          sort: { region_queries_count: "desc" },
          size: 50,
          page: 1,
        },
      );
      setKeywords(res.data || []);
      setKeywordsTotal(res.summary_info?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    }
    setLoading(false);
  }, []);

  // ─── Load Competitors ───
  const loadCompetitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await serpstatCall<{ data: Competitor[] }>(
        "SerpstatDomainProcedure.getCompetitors",
        { domain: DOMAIN, se: SE, size: 20, page: 1 },
      );
      setCompetitors(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    }
    setLoading(false);
  }, []);

  // ─── Load Top URLs ───
  const loadTopUrls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await serpstatCall<{ data: TopUrl[] }>(
        "SerpstatDomainProcedure.getDomainUrls",
        {
          domain: DOMAIN,
          se: SE,
          sort: { keywords: "desc" },
          size: 30,
          page: 1,
        },
      );
      setTopUrls(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    }
    setLoading(false);
  }, []);

  // ─── Tab switch handler ───
  const handleTab = (t: Tab) => {
    setTab(t);
    setError(null);
    if (t === "overview" && !domainInfo) loadOverview();
    if (t === "keywords" && !keywords) loadKeywords();
    if (t === "competitors" && !competitors) loadCompetitors();
    if (t === "pages" && !topUrls) loadTopUrls();
  };

  const refresh = () => {
    if (tab === "overview") { setDomainInfo(null); loadOverview(); }
    if (tab === "keywords") { setKeywords(null); loadKeywords(); }
    if (tab === "competitors") { setCompetitors(null); loadCompetitors(); }
    if (tab === "pages") { setTopUrls(null); loadTopUrls(); }
  };

  // ─── Our domain info ───
  const ours = domainInfo?.find((d) => d.domain === DOMAIN);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTab(t.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  active
                    ? { background: "var(--a-accent-bg)", color: "var(--a-accent)" }
                    : { color: "var(--a-text-4)" }
                }
              >
                <t.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs hidden sm:inline" style={{ color: "var(--a-text-5)" }}>
            {DOMAIN} · google.com.ua
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: "var(--a-bg-card)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Оновити
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          {error.includes("не налаштовано") && (
            <a
              href="/admin/settings/integrations"
              className="ml-auto flex items-center gap-1 text-xs underline"
              style={{ color: "#fbbf24" }}
            >
              <Settings className="w-3 h-3" /> Налаштувати
            </a>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          className="rounded-xl p-12 flex flex-col items-center gap-4"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: "var(--a-border)", borderTopColor: "var(--a-accent)" }}
            />
            <Search
              className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ color: "var(--a-accent)" }}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>
              Завантаження даних Serpstat...
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--a-text-5)" }}>
              Аналіз {DOMAIN} · google.com.ua
            </p>
          </div>
        </div>
      )}

      {/* ═════ OVERVIEW TAB ═════ */}
      {tab === "overview" && !loading && (
        <>
          {/* Empty state */}
          {!domainInfo && !error && (
            <div
              className="rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-[var(--a-accent)] transition-colors"
              style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
              onClick={loadOverview}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--a-accent-bg)" }}
              >
                <BarChart3 className="w-8 h-8" style={{ color: "var(--a-accent)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--a-text)" }}>
                  Завантажити SEO дані
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--a-text-5)" }}>
                  Натисніть для аналізу {DOMAIN} та конкурентів через Serpstat
                </p>
              </div>
            </div>
          )}

          {/* Our domain stats */}
          {ours && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Eye} label="Видимість" value={ours.visible.toFixed(2)} dynamic={ours.visible_dynamic} />
                <StatCard icon={Search} label="Ключових слів" value={fmtNum(ours.keywords)} dynamic={ours.keywords_dynamic} />
                <StatCard icon={MousePointerClick} label="Орг. трафік" value={fmtNum(ours.traff)} dynamic={ours.traff_dynamic} />
                <StatCard icon={Globe} label="Реклама" value={fmtNum(ours.ads)} dynamic={0} />
              </div>

              {/* Keywords movement */}
              <div
                className="rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4"
                style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
              >
                <MiniStat label="Нових слів" value={fmtNum(ours.new_keywords)} color="#22c55e" />
                <MiniStat label="Втрачено слів" value={fmtNum(ours.out_keywords)} color="#ef4444" />
                <MiniStat label="Зросли" value={fmtNum(ours.rised_keywords)} color="#22c55e" />
                <MiniStat label="Впали" value={fmtNum(ours.down_keywords)} color="#ef4444" />
              </div>

              {/* Competitors comparison table */}
              {domainInfo && domainInfo.length > 1 && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
                >
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--a-border)" }}>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--a-text)" }}>
                      Порівняння з конкурентами
                    </h3>
                    <span className="text-[10px]" style={{ color: "var(--a-text-5)" }}>
                      Оновлено: {ours.prev_date}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                          <th className="text-left px-5 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>Домен</th>
                          <th className="text-right px-3 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>Видимість</th>
                          <th className="text-right px-3 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>Ключові</th>
                          <th className="text-right px-3 py-2.5 text-xs font-medium hidden sm:table-cell" style={{ color: "var(--a-text-4)" }}>Трафік</th>
                          <th className="text-right px-5 py-2.5 text-xs font-medium hidden sm:table-cell" style={{ color: "var(--a-text-4)" }}>Δ Ключових</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domainInfo
                          .sort((a, b) => b.visible - a.visible)
                          .map((d) => {
                            const isOurs = d.domain === DOMAIN;
                            const kd = fmtDynamic(d.keywords_dynamic);
                            return (
                              <tr
                                key={d.domain}
                                style={{
                                  borderBottom: "1px solid var(--a-border)",
                                  background: isOurs ? "var(--a-accent-bg)" : undefined,
                                }}
                              >
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    {isOurs && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--a-accent)" }} />}
                                    <span
                                      className="font-medium text-xs"
                                      style={{ color: isOurs ? "var(--a-accent)" : "var(--a-text-2)" }}
                                    >
                                      {d.domain}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-right px-3 py-3 text-xs font-mono" style={{ color: "var(--a-text-2)" }}>
                                  {d.visible.toFixed(2)}
                                </td>
                                <td className="text-right px-3 py-3 text-xs font-mono" style={{ color: "var(--a-text-2)" }}>
                                  {fmtNum(d.keywords)}
                                </td>
                                <td className="text-right px-3 py-3 text-xs font-mono hidden sm:table-cell" style={{ color: "var(--a-text-2)" }}>
                                  {fmtNum(d.traff)}
                                </td>
                                <td className="text-right px-5 py-3 hidden sm:table-cell">
                                  <span className="text-xs font-mono flex items-center justify-end gap-1" style={{ color: kd.color }}>
                                    <kd.Icon className="w-3 h-3" /> {kd.text}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═════ KEYWORDS TAB ═════ */}
      {tab === "keywords" && !loading && keywords && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--a-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--a-text)" }}>
              Топ ключові слова
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ color: "var(--a-text-4)", background: "var(--a-bg)" }}>
              Всього: {fmtNum(keywordsTotal)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                  <th className="text-left px-5 py-2.5 text-xs font-medium w-8" style={{ color: "var(--a-text-5)" }}>#</th>
                  <th className="text-left px-2 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>Ключове слово</th>
                  <th className="text-center px-2 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>Позиція</th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium hidden sm:table-cell" style={{ color: "var(--a-text-4)" }}>Частотність</th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium hidden sm:table-cell" style={{ color: "var(--a-text-4)" }}>Трафік</th>
                  <th className="text-center px-2 py-2.5 text-xs font-medium hidden md:table-cell" style={{ color: "var(--a-text-4)" }}>Δ</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--a-text-4)" }}>URL</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw, i) => {
                  const pd = posDynamic(kw.dynamic);
                  const posColor =
                    kw.position <= 3 ? "#22c55e" : kw.position <= 10 ? "#3b82f6" : kw.position <= 20 ? "#f59e0b" : "var(--a-text-3)";
                  return (
                    <tr key={kw.keyword + i} style={{ borderBottom: "1px solid var(--a-border)" }} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5 text-xs font-mono" style={{ color: "var(--a-text-5)" }}>
                        {i + 1}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="text-xs font-medium" style={{ color: "var(--a-text-2)" }}>
                          {kw.keyword}
                        </span>
                      </td>
                      <td className="text-center px-2 py-2.5">
                        <span
                          className="inline-block px-2 py-0.5 rounded-md text-xs font-bold font-mono"
                          style={{ color: posColor, background: posColor + "15" }}
                        >
                          {kw.position}
                        </span>
                      </td>
                      <td className="text-right px-2 py-2.5 text-xs font-mono hidden sm:table-cell" style={{ color: "var(--a-text-3)" }}>
                        {fmtNum(kw.region_queries_count)}
                      </td>
                      <td className="text-right px-2 py-2.5 text-xs font-mono hidden sm:table-cell" style={{ color: "var(--a-text-3)" }}>
                        {fmtNum(kw.traff)}
                      </td>
                      <td className="text-center px-2 py-2.5 hidden md:table-cell">
                        <span className="text-xs font-mono flex items-center justify-center gap-0.5" style={{ color: pd.color }}>
                          <pd.Icon className="w-3 h-3" /> {pd.text}
                        </span>
                      </td>
                      <td className="text-right px-5 py-2.5 hidden lg:table-cell">
                        {kw.url && (
                          <a
                            href={kw.url}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1 text-[10px] max-w-[200px] truncate"
                            style={{ color: "var(--a-text-4)" }}
                            title={kw.url}
                          >
                            <Link2 className="w-3 h-3 shrink-0" />
                            {kw.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 text-right" style={{ borderTop: "1px solid var(--a-border)" }}>
            <a
              href={`https://serpstat.com/domains/organic/?domain=${DOMAIN}&se=${SE}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: "var(--a-accent)" }}
            >
              Всі ключові в Serpstat <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* ═════ COMPETITORS TAB ═════ */}
      {tab === "competitors" && !loading && competitors && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--a-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--a-text)" }}>
              Органічні конкуренти
            </h3>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--a-text-5)" }}>
              Домени з найбільшим перетином ключових слів з {DOMAIN}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                  <th className="text-left px-5 py-2.5 text-xs font-medium w-8" style={{ color: "var(--a-text-5)" }}>#</th>
                  <th className="text-left px-2 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>Домен</th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>Ключових</th>
                  <th className="text-right px-2 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>Видимість</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium hidden sm:table-cell" style={{ color: "var(--a-text-4)" }}>Перетин</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => {
                  const isKnown = COMPETITOR_DOMAINS.includes(c.domain);
                  return (
                    <tr key={c.domain} style={{ borderBottom: "1px solid var(--a-border)" }} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5 text-xs font-mono" style={{ color: "var(--a-text-5)" }}>
                        {i + 1}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          {isKnown && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }} />}
                          <a
                            href={`https://${c.domain}`}
                            target="_blank"
                            rel="noopener"
                            className="text-xs font-medium hover:underline"
                            style={{ color: isKnown ? "#f59e0b" : "var(--a-text-2)" }}
                          >
                            {c.domain}
                          </a>
                        </div>
                      </td>
                      <td className="text-right px-2 py-2.5 text-xs font-mono" style={{ color: "var(--a-text-2)" }}>
                        {fmtNum(c.keywords)}
                      </td>
                      <td className="text-right px-2 py-2.5 text-xs font-mono" style={{ color: "var(--a-text-2)" }}>
                        {c.visible.toFixed(2)}
                      </td>
                      <td className="text-right px-5 py-2.5 text-xs font-mono hidden sm:table-cell" style={{ color: "var(--a-text-3)" }}>
                        {fmtNum(c.intersection)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════ TOP PAGES TAB ═════ */}
      {tab === "pages" && !loading && topUrls && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--a-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--a-text)" }}>
              Топ сторінки за кількістю ключових слів
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                  <th className="text-left px-5 py-2.5 text-xs font-medium w-8" style={{ color: "var(--a-text-5)" }}>#</th>
                  <th className="text-left px-2 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>URL</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium" style={{ color: "var(--a-text-4)" }}>Ключових</th>
                </tr>
              </thead>
              <tbody>
                {topUrls.map((u, i) => {
                  const shortUrl = u.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
                  const maxKw = topUrls[0]?.keywords || 1;
                  const pct = Math.round((u.keywords / maxKw) * 100);
                  return (
                    <tr key={u.url} style={{ borderBottom: "1px solid var(--a-border)" }} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-xs font-mono" style={{ color: "var(--a-text-5)" }}>
                        {i + 1}
                      </td>
                      <td className="px-2 py-3">
                        <a
                          href={u.url}
                          target="_blank"
                          rel="noopener"
                          className="text-xs font-medium hover:underline flex items-center gap-1.5 max-w-md"
                          style={{ color: "var(--a-text-2)" }}
                          title={u.url}
                        >
                          <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "var(--a-accent)" }} />
                          <span className="truncate">{shortUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-40" />
                        </a>
                        {/* Bar */}
                        <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "var(--a-border)", maxWidth: 200 }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: "var(--a-accent)" }}
                          />
                        </div>
                      </td>
                      <td className="text-right px-5 py-3 text-xs font-mono font-bold" style={{ color: "var(--a-text-2)" }}>
                        {fmtNum(u.keywords)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No data placeholders for keywords/competitors/pages */}
      {tab !== "overview" && !loading && !error && (
        <>
          {tab === "keywords" && !keywords && <EmptyPrompt label="ключових слів" onClick={loadKeywords} />}
          {tab === "competitors" && !competitors && <EmptyPrompt label="конкурентів" onClick={loadCompetitors} />}
          {tab === "pages" && !topUrls && <EmptyPrompt label="топ сторінок" onClick={loadTopUrls} />}
        </>
      )}
    </div>
  );
}

// ─── Stat Card ───
function StatCard({
  icon: Icon,
  label,
  value,
  dynamic: dyn,
}: {
  icon: typeof Search;
  label: string;
  value: string;
  dynamic: number;
}) {
  const d = fmtDynamic(dyn);
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: "var(--a-accent)" }} />
        <span className="text-[11px] font-medium" style={{ color: "var(--a-text-4)" }}>
          {label}
        </span>
      </div>
      <div className="text-xl font-bold font-mono" style={{ color: "var(--a-text)" }}>
        {value}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <d.Icon className="w-3 h-3" style={{ color: d.color }} />
        <span className="text-[10px] font-mono" style={{ color: d.color }}>
          {d.text}
        </span>
      </div>
    </div>
  );
}

// ─── Mini Stat ───
function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold font-mono" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: "var(--a-text-5)" }}>
        {label}
      </div>
    </div>
  );
}

// ─── Empty Prompt ───
function EmptyPrompt({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div
      className="rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--a-accent)] transition-colors"
      style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
      onClick={onClick}
    >
      <Search className="w-8 h-8" style={{ color: "var(--a-text-4)" }} />
      <p className="text-sm" style={{ color: "var(--a-text-3)" }}>
        Натисніть для завантаження {label}
      </p>
    </div>
  );
}
