"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  MessageCircle,
  ArrowUpRight,
  Star,
  DollarSign,
  Users,
  Loader2,
  Settings,
  BookOpen,
  Palette,
  ArrowRight,
  Zap,
  Brain,
  FileText,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PeriodData {
  sessions: number;
  messages: number;
  escalations: number;
  avg_rating: number | null;
  cost_usd: number;
}

interface ChartDay {
  date: string;
  sessions: number;
  cost_usd: number;
  escalations: number;
}

interface DashboardData {
  today: PeriodData;
  week: PeriodData;
  daily_chart: ChartDay[];
  popular_intents: { intent: string; count: number }[];
  popular_faq: { question: string; times_used: number }[];
  managers_online: number;
  managers_total: number;
  budget: {
    today_usd: number;
    daily_limit_usd: number;
    month_usd: number;
    monthly_limit_usd: number;
  };
  model_usage: {
    haiku_calls: number;
    haiku_cost_usd: number;
    sonnet_calls: number;
    sonnet_cost_usd: number;
  };
  is_enabled: boolean;
}

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtUsd(v: number, d = 2): string {
  return `$${v.toFixed(d)}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function pctColor(pct: number): string {
  if (pct > 0.9) return "#ef4444";
  if (pct > 0.7) return "#f59e0b";
  return "#22c55e";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIConsultantDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/ai-consultant/dashboard");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error("[Dashboard] Load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: "var(--a-text-4)" }}>
        <Loader2 className="w-6 h-6 animate-spin" />
        <span style={{ marginLeft: 10 }}>Завантаження дашборду...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "var(--a-text-4)" }}>
        Не вдалося завантажити дані
      </div>
    );
  }

  const { today, week, daily_chart, popular_faq, model_usage, budget } = data;
  const escalPct = today.sessions > 0 ? Math.round((today.escalations / today.sessions) * 100) : 0;
  const budgetPct = budget.daily_limit_usd > 0 ? budget.today_usd / budget.daily_limit_usd : 0;
  const chartMax = Math.max(...daily_chart.map((d) => d.sessions), 1);
  const totalModelCost = model_usage.haiku_cost_usd + model_usage.sonnet_cost_usd;
  const totalModelCalls = model_usage.haiku_calls + model_usage.sonnet_calls;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, var(--a-accent), #ec4899)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot className="w-6 h-6" style={{ color: "#fff" }} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>AI Консультант</h1>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 8,
                background: data.is_enabled ? "#22c55e18" : "#ef444418",
                color: data.is_enabled ? "#22c55e" : "#ef4444",
              }}>
                {data.is_enabled ? "Увімкнено" : "Вимкнено"}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--a-text-4)", margin: "2px 0 0" }}>Огляд роботи AI за сьогодні</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-2">
          {[
            { href: "/admin/ai-consultant/settings", icon: <Settings className="w-3 h-3" />, label: "Налаштування" },
            { href: "/admin/ai-consultant/faq", icon: <BookOpen className="w-3 h-3" />, label: "FAQ" },
            { href: "/admin/ai-consultant/widget", icon: <Palette className="w-3 h-3" />, label: "Віджет" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-1.5"
              style={{
                padding: "5px 12px", borderRadius: 8,
                border: "1px solid var(--a-border)",
                fontSize: 11, fontWeight: 500, color: "var(--a-text-3)",
                textDecoration: "none", background: "var(--a-bg-card)",
                transition: "border-color 0.15s",
              }}
            >
              {l.icon} {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stat cards — 5 in a row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" style={{ marginBottom: 20 }}>
        {/* Chats today */}
        <StatCard
          icon={<MessageCircle className="w-4 h-4" />}
          color="var(--a-accent)"
          value={String(today.sessions)}
          label="Чатів сьогодні"
          sub={`+${week.sessions} за тиждень`}
        />

        {/* Escalations */}
        <StatCard
          icon={<ArrowUpRight className="w-4 h-4" />}
          color="#f59e0b"
          value={String(today.escalations)}
          label="Ескалацій"
          sub={`${escalPct}% від чатів`}
        />

        {/* Rating */}
        <StatCard
          icon={<Star className="w-4 h-4" />}
          color="#f59e0b"
          value={today.avg_rating !== null ? today.avg_rating.toFixed(1) : "—"}
          label="Рейтинг"
          sub={`за тиждень: ${week.avg_rating !== null ? week.avg_rating.toFixed(1) : "—"}`}
        />

        {/* Cost today */}
        <div style={{
          background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
          borderRadius: 14, padding: "12px 14px",
        }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            <span style={{ color: "#22c55e" }}><DollarSign className="w-4 h-4" /></span>
            <span style={{ fontSize: 10, color: "var(--a-text-5)" }}>Вартість сьогодні</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", ...mono, marginBottom: 6 }}>
            {fmtUsd(today.cost_usd)}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--a-bg-hover)", overflow: "hidden", marginBottom: 4 }}>
            <div style={{
              height: "100%", borderRadius: 2,
              width: `${Math.min(budgetPct * 100, 100)}%`,
              background: pctColor(budgetPct),
              transition: "width 0.3s",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--a-text-5)", ...mono }}>
            {fmtUsd(budget.today_usd)} / {fmtUsd(budget.daily_limit_usd)}
          </div>
        </div>

        {/* Managers online */}
        <StatCard
          icon={<Users className="w-4 h-4" />}
          color="#06b6d4"
          value={`${data.managers_online} / ${data.managers_total}`}
          label="Менеджери онлайн"
          sub={`${data.managers_total} активних`}
        />
      </div>

      {/* Chart */}
      <div style={{
        background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
        borderRadius: 16, padding: 20, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)", margin: "0 0 16px" }}>
          Активність за тиждень
        </h3>

        {daily_chart.length > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, minHeight: 180 }}>
              {daily_chart.map((d) => {
                const hPct = (d.sessions / chartMax) * 100;
                return (
                  <div
                    key={d.date}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: 180 }}
                    title={`${d.date}: ${d.sessions} сесій, ${fmtUsd(d.cost_usd, 4)}`}
                  >
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--a-text-3)", marginBottom: 4, ...mono }}>
                      {d.sessions > 0 ? d.sessions : ""}
                    </div>
                    <div style={{
                      width: "60%", maxWidth: 40,
                      height: `${Math.max(hPct, 2.5)}%`,
                      minHeight: 4,
                      background: "linear-gradient(180deg, var(--a-accent), #ec4899)",
                      borderRadius: "6px 6px 2px 2px",
                      transition: "height 0.3s",
                    }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {daily_chart.map((d) => (
                <div key={d.date} style={{ flex: 1, textAlign: "center", fontSize: 10, color: "var(--a-text-5)", ...mono }}>
                  {fmtDate(d.date)}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--a-text-5)", fontSize: 13 }}>
            Дані зʼявляться після першого дня роботи
          </div>
        )}
      </div>

      {/* Two columns: Popular FAQ + Model usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
        {/* Popular FAQ */}
        <div style={{
          background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
          borderRadius: 16, padding: 20,
        }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            <BookOpen className="w-4 h-4" style={{ color: "var(--a-accent)" }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Популярні питання</h3>
          </div>

          {popular_faq.length > 0 ? (
            <div className="flex flex-col gap-2">
              {popular_faq.map((faq, i) => (
                <div key={i} className="flex items-start gap-3" style={{ padding: "6px 0" }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: "var(--a-accent-bg)", color: "var(--a-accent)",
                    fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--a-text-2)", lineHeight: 1.4 }}>
                    {faq.question}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                    background: "var(--a-bg-hover)", color: "var(--a-text-4)", flexShrink: 0, ...mono,
                  }}>
                    {faq.times_used}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--a-text-5)", fontSize: 12 }}>
              FAQ ще не використовувався
            </div>
          )}
        </div>

        {/* Model usage */}
        <div style={{
          background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
          borderRadius: 16, padding: 20,
        }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            <Brain className="w-4 h-4" style={{ color: "var(--a-accent)" }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Використання моделей</h3>
          </div>

          {/* Haiku */}
          <ModelRow
            name="Haiku 4.5"
            icon={<Zap className="w-3.5 h-3.5" />}
            calls={model_usage.haiku_calls}
            cost={model_usage.haiku_cost_usd}
            pct={totalModelCalls > 0 ? model_usage.haiku_calls / totalModelCalls : 0}
            color="#06b6d4"
          />

          {/* Sonnet */}
          <ModelRow
            name="Sonnet 4.5"
            icon={<Brain className="w-3.5 h-3.5" />}
            calls={model_usage.sonnet_calls}
            cost={model_usage.sonnet_cost_usd}
            pct={totalModelCalls > 0 ? model_usage.sonnet_calls / totalModelCalls : 0}
            color="var(--a-accent)"
          />

          {/* Total */}
          <div style={{
            marginTop: 14, paddingTop: 14,
            borderTop: "1px solid var(--a-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--a-text)" }}>
              Загалом за тиждень
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--a-text)", ...mono }}>
              {fmtUsd(totalModelCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction
          href="/admin/ai-consultant/settings"
          icon={<FileText className="w-5 h-5" />}
          title="Редагувати промпт"
          description="Налаштуйте системний промпт та моделі"
        />
        <QuickAction
          href="/admin/ai-consultant/faq"
          icon={<BookOpen className="w-5 h-5" />}
          title="Додати FAQ"
          description="Поповніть базу знань консультанта"
        />
        <QuickAction
          href="/admin/ai-consultant/widget"
          icon={<Palette className="w-5 h-5" />}
          title="Змінити дизайн"
          description="Зовнішній вигляд чат-віджета"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  icon, color, value, label, sub,
}: {
  icon: React.ReactNode; color: string; value: string; label: string; sub: string;
}) {
  return (
    <div style={{
      background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
      borderRadius: 14, padding: "12px 14px",
    }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 10, color: "var(--a-text-5)" }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--a-text-4)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function ModelRow({
  name, icon, calls, cost, pct, color,
}: {
  name: string; icon: React.ReactNode; calls: number; cost: number; pct: number; color: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--a-text)" }}>{name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 11, color: "var(--a-text-4)" }}>{calls.toLocaleString()} запитів</span>
          <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: "'JetBrains Mono', monospace" }}>
            {fmtUsd(cost)}
          </span>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--a-bg-hover)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3,
          width: `${Math.max(pct * 100, 0)}%`,
          background: color,
          transition: "width 0.3s",
        }} />
      </div>
    </div>
  );
}

function QuickAction({
  href, icon, title, description,
}: {
  href: string; icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
        borderRadius: 14, padding: "16px 18px",
        textDecoration: "none", transition: "border-color 0.15s",
        cursor: "pointer",
      }}
    >
      <span style={{ color: "var(--a-accent)", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--a-text)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--a-text-4)", marginTop: 1 }}>{description}</div>
      </div>
      <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--a-text-5)" }} />
    </Link>
  );
}
