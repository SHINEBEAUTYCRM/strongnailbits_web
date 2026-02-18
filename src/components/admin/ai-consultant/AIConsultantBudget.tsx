"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  Loader2,
  BarChart3,
  Zap,
  Brain,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BudgetDay {
  id: string;
  date: string;
  total_sessions: number;
  total_messages: number;
  total_escalations: number;
  cost_usd: number;
  haiku_calls: number;
  haiku_cost_usd: number;
  sonnet_calls: number;
  sonnet_cost_usd: number;
  budget_exceeded: boolean;
}

interface Totals {
  total_sessions: number;
  total_messages: number;
  total_escalations: number;
  cost_usd: number;
  haiku_calls: number;
  haiku_cost_usd: number;
  sonnet_calls: number;
  sonnet_cost_usd: number;
}

interface Limits {
  daily_budget_usd: number;
  monthly_budget_usd: number;
  budget_action: string;
}

type Period = "today" | "week" | "month" | "all";

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: "today", label: "Сьогодні" },
  { value: "week", label: "7 днів" },
  { value: "month", label: "30 днів" },
  { value: "all", label: "Весь час" },
];

const BUDGET_ACTION_LABELS: Record<string, string> = {
  haiku_only: "Тільки Haiku",
  warn: "Попередження",
  stop: "Зупинити",
};

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtUsd(v: number, decimals = 2): string {
  return `$${v.toFixed(decimals)}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function progressColor(pct: number): string {
  if (pct > 0.9) return "#ef4444";
  if (pct > 0.7) return "#f59e0b";
  return "#22c55e";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIConsultantBudget() {
  const [days, setDays] = useState<BudgetDay[]>([]);
  const [totals, setTotals] = useState<Totals>({ total_sessions: 0, total_messages: 0, total_escalations: 0, cost_usd: 0, haiku_calls: 0, haiku_cost_usd: 0, sonnet_calls: 0, sonnet_cost_usd: 0 });
  const [limits, setLimits] = useState<Limits>({ daily_budget_usd: 50, monthly_budget_usd: 1000, budget_action: "haiku_only" });
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [tableOpen, setTableOpen] = useState(false);

  /* ── Load ────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-consultant/budget?period=${period}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDays(json.data.days || []);
        setTotals(json.data.totals || totals);
        setLimits(json.data.limits || limits);
      }
    } catch (err) {
      console.error("[Budget] Load error:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Derived values ──────────────────────────────── */

  const todayStr = new Date().toISOString().split("T")[0];
  const todayRow = days.find((d) => d.date === todayStr);
  const todayCost = todayRow?.cost_usd || 0;
  const todayPct = limits.daily_budget_usd > 0 ? todayCost / limits.daily_budget_usd : 0;

  const monthCost = totals.cost_usd;
  const monthPct = limits.monthly_budget_usd > 0 ? monthCost / limits.monthly_budget_usd : 0;

  const avgChatCost = totals.total_sessions > 0 ? totals.cost_usd / totals.total_sessions : 0;

  const totalCalls = totals.haiku_calls + totals.sonnet_calls;
  const haikuPct = totalCalls > 0 ? totals.haiku_cost_usd / Math.max(totals.cost_usd, 0.0001) : 0;
  const sonnetPct = totalCalls > 0 ? totals.sonnet_cost_usd / Math.max(totals.cost_usd, 0.0001) : 0;

  /* Chart data — reversed so oldest first */
  const chartDays = [...days].reverse();
  const maxCost = Math.max(...chartDays.map((d) => d.cost_usd), 0.01);

  /* ── Render ──────────────────────────────────────── */

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #f59e0b, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <DollarSign className="w-6 h-6" style={{ color: "#fff" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Бюджет Claude API</h1>
          <p style={{ fontSize: 13, color: "var(--a-text-4)", margin: "2px 0 0" }}>Контроль витрат та використання AI моделей</p>
        </div>
      </div>

      {/* Period pills */}
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 20 }}>
        {PERIOD_LABELS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              padding: "6px 16px", borderRadius: 10, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: period === p.value ? "var(--a-accent)" : "var(--a-bg-hover)",
              color: period === p.value ? "#fff" : "var(--a-text-3)",
              transition: "all 0.15s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "var(--a-text-4)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span style={{ marginLeft: 8, fontSize: 13 }}>Завантаження...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: 20 }}>
            {/* Today */}
            <BudgetCard
              label="Витрачено сьогодні"
              value={`${fmtUsd(todayCost)} / ${fmtUsd(limits.daily_budget_usd)}`}
              pct={todayPct}
              color={progressColor(todayPct)}
            />
            {/* Month */}
            <BudgetCard
              label="Витрачено за місяць"
              value={`${fmtUsd(monthCost)} / ${fmtUsd(limits.monthly_budget_usd)}`}
              pct={monthPct}
              color={progressColor(monthPct)}
            />
            {/* Avg cost */}
            <div style={{
              background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
              borderRadius: 14, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 10, color: "var(--a-text-5)", marginBottom: 4 }}>Середня вартість чату</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", ...mono }}>{fmtUsd(avgChatCost, 4)}</div>
            </div>
            {/* Total requests */}
            <div style={{
              background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
              borderRadius: 14, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 10, color: "var(--a-text-5)", marginBottom: 4 }}>Всього запитів</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", ...mono }}>{totals.total_messages.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: "var(--a-text-4)", marginTop: 2 }}>
                Haiku: {totals.haiku_calls} / Sonnet: {totals.sonnet_calls}
              </div>
            </div>
          </div>

          {/* Chart */}
          {days.length > 0 ? (
            <div style={{
              background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
              borderRadius: 16, padding: 20, marginBottom: 20,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)", margin: "0 0 16px" }}>Витрати по днях</h3>

              <div style={{ minHeight: 200, display: "flex", alignItems: "flex-end", gap: 2 }}>
                {chartDays.map((d) => {
                  const hPct = maxCost > 0 ? (d.haiku_cost_usd / maxCost) * 100 : 0;
                  const sPct = maxCost > 0 ? (d.sonnet_cost_usd / maxCost) * 100 : 0;
                  const totalH = 180;

                  return (
                    <div
                      key={d.date}
                      style={{
                        flex: 1, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "flex-end",
                        height: totalH, minWidth: 0,
                      }}
                      title={`${d.date}: ${fmtUsd(d.cost_usd, 4)} (H: ${fmtUsd(d.haiku_cost_usd, 4)}, S: ${fmtUsd(d.sonnet_cost_usd, 4)})`}
                    >
                      {/* Sonnet bar (top) */}
                      <div style={{
                        width: "70%", maxWidth: 24,
                        height: `${(sPct / 100) * totalH}px`,
                        background: "var(--a-accent)",
                        borderRadius: "4px 4px 0 0",
                        minHeight: sPct > 0 ? 2 : 0,
                      }} />
                      {/* Haiku bar (bottom) */}
                      <div style={{
                        width: "70%", maxWidth: 24,
                        height: `${(hPct / 100) * totalH}px`,
                        background: "#06b6d4",
                        borderRadius: d.sonnet_cost_usd > 0 ? "0 0 4px 4px" : "4px",
                        minHeight: hPct > 0 ? 2 : 0,
                      }} />
                    </div>
                  );
                })}
              </div>

              {/* X axis labels — show every Nth to avoid crowding */}
              <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
                {chartDays.map((d, i) => {
                  const step = Math.max(1, Math.floor(chartDays.length / 10));
                  const show = i % step === 0 || i === chartDays.length - 1;
                  return (
                    <div key={d.date} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "var(--a-text-5)", ...mono, minWidth: 0, overflow: "hidden" }}>
                      {show ? fmtDate(d.date) : ""}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5" style={{ marginTop: 12 }}>
                <div className="flex items-center gap-2">
                  <div style={{ width: 12, height: 8, borderRadius: 3, background: "#06b6d4" }} />
                  <span style={{ fontSize: 11, color: "var(--a-text-4)" }}>Haiku 4.5</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: 12, height: 8, borderRadius: 3, background: "var(--a-accent)" }} />
                  <span style={{ fontSize: 11, color: "var(--a-text-4)" }}>Sonnet 4.5</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
              borderRadius: 16, padding: 60, textAlign: "center", color: "var(--a-text-4)",
              marginBottom: 20,
            }}>
              <BarChart3 className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 14, marginBottom: 4 }}>Дані про витрати зʼявляться</p>
              <p style={{ fontSize: 12 }}>після першого дня роботи AI консультанта</p>
            </div>
          )}

          {/* Model breakdown */}
          {totals.cost_usd > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: 20 }}>
              <ModelCard
                name="Haiku 4.5"
                calls={totals.haiku_calls}
                cost={totals.haiku_cost_usd}
                avgCost={totals.haiku_calls > 0 ? totals.haiku_cost_usd / totals.haiku_calls : 0}
                pct={haikuPct}
                color="#06b6d4"
                icon={<Zap className="w-4 h-4" />}
              />
              <ModelCard
                name="Sonnet 4.5"
                calls={totals.sonnet_calls}
                cost={totals.sonnet_cost_usd}
                avgCost={totals.sonnet_calls > 0 ? totals.sonnet_cost_usd / totals.sonnet_calls : 0}
                pct={sonnetPct}
                color="var(--a-accent)"
                icon={<Brain className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Daily details table (collapsible) */}
          {days.length > 0 && (
            <div style={{
              background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
              borderRadius: 16, overflow: "hidden", marginBottom: 20,
            }}>
              <button
                onClick={() => setTableOpen(!tableOpen)}
                className="flex items-center justify-between w-full"
                style={{
                  padding: "14px 20px", background: "transparent", border: "none",
                  cursor: "pointer", color: "var(--a-text-3)", fontSize: 13, fontWeight: 600,
                }}
              >
                <span>Показати деталі по днях</span>
                {tableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {tableOpen && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderTop: "1px solid var(--a-border)", borderBottom: "1px solid var(--a-border)" }}>
                        {["Дата", "Сесій", "Повідом.", "Ескал.", "Haiku", "Sonnet", "Вартість"].map((h) => (
                          <th key={h} style={{
                            padding: "8px 12px", textAlign: "left",
                            fontSize: 10, fontWeight: 600, color: "var(--a-text-5)",
                            textTransform: "uppercase", letterSpacing: "0.05em",
                            whiteSpace: "nowrap",
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((d) => {
                        const isOver = d.budget_exceeded;
                        const isHigh = d.cost_usd > limits.daily_budget_usd * 0.8;
                        return (
                          <tr
                            key={d.id}
                            style={{
                              borderBottom: "1px solid var(--a-border)",
                              background: isOver ? "rgba(239,68,68,0.05)" : "transparent",
                            }}
                          >
                            <td style={{ padding: "8px 12px", ...mono, fontSize: 11, color: "var(--a-text-3)", whiteSpace: "nowrap" }}>
                              {d.date}
                            </td>
                            <td style={{ padding: "8px 12px", ...mono, color: "var(--a-text-3)" }}>{d.total_sessions}</td>
                            <td style={{ padding: "8px 12px", ...mono, color: "var(--a-text-3)" }}>{d.total_messages}</td>
                            <td style={{ padding: "8px 12px", ...mono, color: "var(--a-text-3)" }}>{d.total_escalations}</td>
                            <td style={{ padding: "8px 12px", ...mono, color: "#06b6d4" }}>{d.haiku_calls}</td>
                            <td style={{ padding: "8px 12px", ...mono, color: "var(--a-accent)" }}>{d.sonnet_calls}</td>
                            <td style={{
                              padding: "8px 12px", ...mono,
                              fontWeight: isHigh ? 700 : 400,
                              color: isOver ? "#ef4444" : isHigh ? "#f59e0b" : "var(--a-text)",
                            }}>
                              {fmtUsd(d.cost_usd, 4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Budget limits info */}
          <div style={{
            background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
            borderRadius: 16, padding: 20,
          }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
              <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Бюджетні ліміти</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--a-text-5)", marginBottom: 2 }}>Денний ліміт</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--a-text)", ...mono }}>
                  {fmtUsd(limits.daily_budget_usd)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--a-text-5)", marginBottom: 2 }}>Місячний ліміт</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--a-text)", ...mono }}>
                  {fmtUsd(limits.monthly_budget_usd)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--a-text-5)", marginBottom: 2 }}>Дія при перевищенні</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b" }}>
                  {BUDGET_ACTION_LABELS[limits.budget_action] || limits.budget_action}
                </div>
              </div>
            </div>

            <Link
              href="/admin/ai-consultant/settings"
              className="flex items-center gap-1"
              style={{
                fontSize: 12, fontWeight: 600, color: "var(--a-accent)",
                textDecoration: "none",
              }}
            >
              Змінити в налаштуваннях <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Budget Stat Card with progress bar                                 */
/* ------------------------------------------------------------------ */

function BudgetCard({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div style={{
      background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
      borderRadius: 14, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 10, color: "var(--a-text-5)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--a-text)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
        {value}
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--a-bg-hover)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3,
          width: `${Math.min(pct * 100, 100)}%`,
          background: color,
          transition: "width 0.3s",
        }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Model Card                                                         */
/* ------------------------------------------------------------------ */

function ModelCard({
  name, calls, cost, avgCost, pct, color, icon,
}: {
  name: string; calls: number; cost: number; avgCost: number;
  pct: number; color: string; icon: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
      borderRadius: 14, padding: 16,
    }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)" }}>{name}</span>
      </div>

      <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--a-text-5)" }}>Запитів</div>
          <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
            {calls.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--a-text-5)" }}>Вартість</div>
          <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
            {fmtUsd(cost)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--a-text-5)" }}>Середня</div>
          <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
            {fmtUsd(avgCost, 4)}
          </div>
        </div>
      </div>

      {/* Share bar */}
      <div style={{ height: 6, borderRadius: 3, background: "var(--a-bg-hover)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3,
          width: `${Math.min(pct * 100, 100)}%`,
          background: color,
          transition: "width 0.3s",
        }} />
      </div>
      <div style={{ fontSize: 10, color: "var(--a-text-5)", marginTop: 4 }}>
        {(pct * 100).toFixed(1)}% від загальної вартості
      </div>
    </div>
  );
}
