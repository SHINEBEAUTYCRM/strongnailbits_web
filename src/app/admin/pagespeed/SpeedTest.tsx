"use client";

import { useState, useCallback } from "react";
import {
  Gauge, Loader2, RefreshCw, Smartphone, Monitor,
  Zap, Image, FileText, Globe, Clock, AlertTriangle, CheckCircle,
  ExternalLink,
} from "lucide-react";

interface AuditRef {
  id: string;
  weight: number;
  group?: string;
}

interface Audit {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
}

interface Category {
  id: string;
  title: string;
  score: number | null;
  auditRefs: AuditRef[];
}

interface LighthouseResult {
  categories: Record<string, Category>;
  audits: Record<string, Audit>;
  configSettings: { formFactor: string };
  fetchTime: string;
}

interface PSIResult {
  lighthouseResult: LighthouseResult;
  loadingExperience?: {
    metrics?: Record<string, { percentile: number; category: string }>;
    overall_category?: string;
  };
}

type Strategy = "mobile" | "desktop";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2bcomua.vercel.app";
const PSI_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PSI_KEY || "";

const PAGES = [
  { label: "Головна", path: "/" },
  { label: "Каталог", path: "/catalog" },
  { label: "Про нас", path: "/about" },
  { label: "Доставка", path: "/delivery" },
];

function scoreColor(score: number | null): string {
  if (score === null) return "#52525b";
  if (score >= 0.9) return "#4ade80";
  if (score >= 0.5) return "#fbbf24";
  return "#f87171";
}

function scoreBg(score: number | null): string {
  if (score === null) return "#18181b";
  if (score >= 0.9) return "#052e16";
  if (score >= 0.5) return "#422006";
  return "#450a0a";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  return Math.round(score * 100).toString();
}

// Key metrics we want to highlight
const KEY_METRICS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
  "interactive",
];

const METRIC_ICONS: Record<string, typeof Zap> = {
  "first-contentful-paint": Zap,
  "largest-contentful-paint": Image,
  "total-blocking-time": Clock,
  "cumulative-layout-shift": FileText,
  "speed-index": Gauge,
  "interactive": Globe,
};

export function SpeedTest() {
  const [strategy, setStrategy] = useState<Strategy>("mobile");
  const [selectedPage, setSelectedPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PSIResult | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const runTest = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult(null);
    const t0 = Date.now();

    const url = `${SITE_URL}${PAGES[selectedPage].path}`;
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
    if (PSI_API_KEY) {
      apiUrl += `&key=${PSI_API_KEY}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout

      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        let msg = `API Error ${res.status}`;
        if (res.status === 429) {
          msg = "Ліміт запитів перевищено. Спробуйте через хвилину або додайте Google PSI API Key в NEXT_PUBLIC_GOOGLE_PSI_KEY";
        } else if (res.status === 500) {
          msg = `Google API не зміг проаналізувати ${url}. Перевірте що сайт доступний.`;
        } else {
          try {
            const json = JSON.parse(text);
            msg = json.error?.message || text.slice(0, 200);
          } catch { msg = text.slice(0, 200); }
        }
        throw new Error(msg);
      }
      const data: PSIResult = await res.json();
      setResult(data);
      setElapsed(Math.round((Date.now() - t0) / 1000));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Тест перевищив 90 секунд. Google API не відповів. Спробуйте ще раз.");
      } else {
        setError(err instanceof Error ? err.message : "Помилка тесту");
      }
    }
    setLoading(false);
  }, [strategy, selectedPage]);

  const lhr = result?.lighthouseResult;
  const cats = lhr?.categories;
  const audits = lhr?.audits;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-xl p-5" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          {/* Page selector */}
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Сторінка</label>
            <div className="flex flex-wrap gap-2">
              {PAGES.map((p, i) => (
                <button key={p.path} onClick={() => setSelectedPage(i)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={selectedPage === i ? { background: "#1e1030", color: "#c084fc", border: "1px solid #581c87" } : { background: "#111116", color: "#71717a", border: "1px solid #1e1e2a" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>Пристрій</label>
            <div className="flex gap-2">
              <button onClick={() => setStrategy("mobile")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={strategy === "mobile" ? { background: "#1e1030", color: "#c084fc", border: "1px solid #581c87" } : { background: "#111116", color: "#71717a", border: "1px solid #1e1e2a" }}>
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
              <button onClick={() => setStrategy("desktop")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={strategy === "desktop" ? { background: "#1e1030", color: "#c084fc", border: "1px solid #581c87" } : { background: "#111116", color: "#71717a", border: "1px solid #1e1e2a" }}>
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
            </div>
          </div>

          {/* Run button */}
          <button onClick={runTest} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 shrink-0"
            style={{ background: "#7c3aed" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? "Тестування..." : "Запустити тест"}
          </button>
        </div>

        <p className="text-[10px] mt-3" style={{ color: "#3f3f46" }}>
          URL: {SITE_URL}{PAGES[selectedPage].path} · Google PageSpeed Insights API · ~20-60с
          {!PSI_API_KEY && <span style={{ color: "#fbbf24" }}> · Без API ключа (обмежений rate limit)</span>}
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" }}>
          <AlertTriangle className="w-4 h-4 inline mr-2" />{error}
        </div>
      )}

      {/* Loading animation */}
      {loading && (
        <div className="rounded-xl p-12 flex flex-col items-center gap-4" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "#1e1e2a", borderTopColor: "#a855f7" }} />
            <Gauge className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: "#a855f7" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "#a1a1aa" }}>Аналіз швидкості...</p>
            <p className="text-xs mt-1" style={{ color: "#3f3f46" }}>Google Lighthouse сканує сторінку</p>
          </div>
        </div>
      )}

      {/* Results */}
      {cats && audits && (
        <>
          {/* Score circles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["performance", "accessibility", "best-practices", "seo"].map((key) => {
              const cat = cats[key];
              if (!cat) return null;
              const s = cat.score;
              const pct = s !== null ? Math.round(s * 100) : 0;
              const color = scoreColor(s);
              const labels: Record<string, string> = { performance: "Продуктивність", accessibility: "Доступність", "best-practices": "Практики", seo: "SEO" };
              return (
                <div key={key} className="rounded-xl p-5 flex flex-col items-center" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
                  {/* Circular gauge */}
                  <div className="relative w-20 h-20 mb-3">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#1e1e2a" strokeWidth="8" />
                      <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray={`${pct * 3.39} 339.292`}
                        strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold font-mono" style={{ color }}>
                      {scoreLabel(s)}
                    </span>
                  </div>
                  <p className="text-xs font-medium" style={{ color: "#a1a1aa" }}>{labels[key] || cat.title}</p>
                </div>
              );
            })}
          </div>

          {/* Core Web Vitals */}
          <div className="rounded-xl p-5" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: "#a1a1aa" }}>
              <Zap className="w-4 h-4" style={{ color: "#a855f7" }} /> Core Web Vitals & Метрики
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {KEY_METRICS.map((id) => {
                const audit = audits[id];
                if (!audit) return null;
                const Icon = METRIC_ICONS[id] || Gauge;
                const s = audit.score;
                const color = scoreColor(s);
                const bg = scoreBg(s);
                return (
                  <div key={id} className="rounded-lg p-3 flex items-center gap-3" style={{ background: bg, border: `1px solid ${color}20` }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "#a1a1aa" }}>{audit.title}</p>
                      <p className="text-lg font-bold font-mono" style={{ color }}>{audit.displayValue || scoreLabel(s)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opportunities & Diagnostics */}
          <div className="rounded-xl p-5" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: "#a1a1aa" }}>
              <AlertTriangle className="w-4 h-4" style={{ color: "#fbbf24" }} /> Рекомендації
            </h3>
            <div className="space-y-2">
              {cats.performance?.auditRefs
                .filter((ref) => (ref.group === "diagnostics" || ref.group === "budgets") && audits[ref.id]?.score !== null && audits[ref.id]?.score !== undefined && (audits[ref.id]?.score ?? 1) < 1)
                .sort((a, b) => (audits[a.id]?.score ?? 1) - (audits[b.id]?.score ?? 1))
                .slice(0, 10)
                .map((ref) => {
                  const audit = audits[ref.id];
                  if (!audit) return null;
                  const color = scoreColor(audit.score);
                  return (
                    <div key={ref.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "#111116" }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <p className="text-xs flex-1" style={{ color: "#a1a1aa" }}>{audit.title}</p>
                      {audit.displayValue && <span className="text-xs font-mono shrink-0" style={{ color }}>{audit.displayValue}</span>}
                    </div>
                  );
                })}
              {cats.performance?.auditRefs
                .filter((ref) => ref.group === "diagnostics" && audits[ref.id]?.score !== null && (audits[ref.id]?.score ?? 1) < 1).length === 0 && (
                <div className="flex items-center gap-2 px-3 py-3" style={{ color: "#4ade80" }}>
                  <CheckCircle className="w-4 h-4" /> <span className="text-sm">Все добре!</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer info */}
          <div className="flex items-center justify-between text-[10px] px-1" style={{ color: "#3f3f46" }}>
            <span>Тест зайняв {elapsed}с · {new Date(lhr.fetchTime).toLocaleString("uk-UA")}</span>
            <a href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(SITE_URL + PAGES[selectedPage].path)}&form_factor=${strategy}`}
              target="_blank" rel="noopener" className="flex items-center gap-1" style={{ color: "#71717a" }}>
              Повний звіт <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
