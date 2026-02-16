"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Save, Loader2, Bot } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScheduleRow {
  id: string;
  day_of_week: number;
  is_working: boolean;
  ai_start: string;
  ai_end: string;
  managers_start: string;
  managers_end: string;
  offline_message: string | null;
}

const DAY_NAMES = [
  "Понеділок",
  "Вівторок",
  "Середа",
  "Четвер",
  "П'ятниця",
  "Субота",
  "Неділя",
];

const DAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const timeInputStyle: React.CSSProperties = {
  background: "var(--a-bg-input)",
  border: "1px solid var(--a-border)",
  borderRadius: 12,
  padding: "7px 10px",
  color: "var(--a-text)",
  fontSize: 13,
  fontFamily: "'JetBrains Mono', monospace",
  textAlign: "center",
  width: 96,
  outline: "none",
};

const textInputStyle: React.CSSProperties = {
  background: "var(--a-bg-input)",
  border: "1px solid var(--a-border)",
  borderRadius: 12,
  padding: "7px 12px",
  color: "var(--a-text)",
  fontSize: 13,
  width: "100%",
  outline: "none",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIConsultantSchedule() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  /* ── Load ────────────────────────────────────────── */

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/ai-consultant/schedule");
        const json = await res.json();
        if (json.success && json.data) setRows(json.data);
      } catch (err) {
        console.error("[Schedule] Load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Update helper ───────────────────────────────── */

  const updateRow = useCallback(
    <K extends keyof ScheduleRow>(idx: number, key: K, value: ScheduleRow[K]) => {
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
      setDirty(true);
      setSaved(false);
    },
    [],
  );

  /* ── Save ────────────────────────────────────────── */

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai-consultant/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data) setRows(json.data);
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("[Schedule] Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading ─────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: "var(--a-text-4)" }}>
        <Loader2 className="w-6 h-6 animate-spin" />
        <span style={{ marginLeft: 10 }}>Завантаження...</span>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────── */

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, var(--a-accent), #ec4899)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock className="w-6 h-6" style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Робочі години</h1>
            <p style={{ fontSize: 13, color: "var(--a-text-4)", margin: "2px 0 0" }}>
              AI працює 24/7. Тут налаштовується коли доступні менеджери для ескалації.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2"
          style={{
            padding: "10px 22px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 600,
            background: dirty && !saving ? "linear-gradient(135deg, var(--a-accent), #ec4899)" : saved ? "#22c55e" : "var(--a-bg-hover)",
            color: dirty || saved ? "#fff" : "var(--a-text-4)",
            cursor: dirty && !saving ? "pointer" : "default",
            opacity: !dirty && !saved ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Зберігаю..." : saved ? "Збережено!" : "Зберегти"}
        </button>
      </div>

      {/* Info banner */}
      <div
        className="flex items-center gap-3"
        style={{
          background: "var(--a-accent-bg)",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <Bot className="w-5 h-5 flex-shrink-0" style={{ color: "var(--a-accent)" }} />
        <span style={{ fontSize: 13, color: "var(--a-accent)", fontWeight: 500 }}>
          AI консультант доступний 24/7 незалежно від графіку менеджерів
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block" style={{
        background: "var(--a-bg-card)",
        border: "1px solid var(--a-border)",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 24,
      }}>
        {/* Table header */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "140px 70px 220px 1fr",
            padding: "12px 20px",
            borderBottom: "1px solid var(--a-border)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--a-text-4)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>День</span>
          <span>Робочий</span>
          <span>Менеджери (час)</span>
          <span>Офлайн повідомлення</span>
        </div>

        {/* Table rows */}
        {rows.map((row, idx) => {
          const isWeekend = row.day_of_week >= 6;
          return (
            <div
              key={row.id}
              className="grid items-center"
              style={{
                gridTemplateColumns: "140px 70px 220px 1fr",
                padding: "14px 20px",
                borderBottom: idx < rows.length - 1 ? "1px solid var(--a-border)" : "none",
                opacity: row.is_working ? 1 : 0.5,
                transition: "opacity 0.2s",
              }}
            >
              {/* Day name */}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--a-text)" }}>
                  {DAY_NAMES[row.day_of_week - 1]}
                </span>
                {isWeekend && !row.is_working && (
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 5,
                    background: "#f59e0b18", color: "#f59e0b",
                  }}>
                    вихідний
                  </span>
                )}
              </div>

              {/* Toggle */}
              <div>
                <Toggle checked={row.is_working} onChange={(v) => updateRow(idx, "is_working", v)} />
              </div>

              {/* Manager hours */}
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={row.managers_start || "09:00"}
                  onChange={(e) => updateRow(idx, "managers_start", e.target.value)}
                  disabled={!row.is_working}
                  style={{ ...timeInputStyle, opacity: row.is_working ? 1 : 0.4 }}
                />
                <span style={{ color: "var(--a-text-5)", fontSize: 13 }}>—</span>
                <input
                  type="time"
                  value={row.managers_end || "18:00"}
                  onChange={(e) => updateRow(idx, "managers_end", e.target.value)}
                  disabled={!row.is_working}
                  style={{ ...timeInputStyle, opacity: row.is_working ? 1 : 0.4 }}
                />
              </div>

              {/* Offline message */}
              <div>
                <input
                  type="text"
                  value={row.offline_message || ""}
                  onChange={(e) => updateRow(idx, "offline_message", e.target.value)}
                  disabled={!row.is_working}
                  placeholder={`Менеджери повернуться о ${row.managers_start || "09:00"}`}
                  style={{ ...textInputStyle, opacity: row.is_working ? 1 : 0.4 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3" style={{ marginBottom: 24 }}>
        {rows.map((row, idx) => {
          const isWeekend = row.day_of_week >= 6;
          return (
            <div
              key={row.id}
              style={{
                background: "var(--a-bg-card)",
                border: "1px solid var(--a-border)",
                borderRadius: 14,
                padding: 16,
                opacity: row.is_working ? 1 : 0.5,
                transition: "opacity 0.2s",
              }}
            >
              {/* Day + toggle */}
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--a-text)" }}>
                    {DAY_NAMES[row.day_of_week - 1]}
                  </span>
                  {isWeekend && !row.is_working && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 5,
                      background: "#f59e0b18", color: "#f59e0b",
                    }}>
                      вихідний
                    </span>
                  )}
                </div>
                <Toggle checked={row.is_working} onChange={(v) => updateRow(idx, "is_working", v)} />
              </div>

              {/* Time inputs */}
              <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "var(--a-text-4)", width: 70, flexShrink: 0 }}>Менеджери</span>
                <input
                  type="time"
                  value={row.managers_start || "09:00"}
                  onChange={(e) => updateRow(idx, "managers_start", e.target.value)}
                  disabled={!row.is_working}
                  style={{ ...timeInputStyle, opacity: row.is_working ? 1 : 0.4, flex: 1 }}
                />
                <span style={{ color: "var(--a-text-5)" }}>—</span>
                <input
                  type="time"
                  value={row.managers_end || "18:00"}
                  onChange={(e) => updateRow(idx, "managers_end", e.target.value)}
                  disabled={!row.is_working}
                  style={{ ...timeInputStyle, opacity: row.is_working ? 1 : 0.4, flex: 1 }}
                />
              </div>

              {/* Offline message */}
              <input
                type="text"
                value={row.offline_message || ""}
                onChange={(e) => updateRow(idx, "offline_message", e.target.value)}
                disabled={!row.is_working}
                placeholder={`Менеджери повернуться о ${row.managers_start || "09:00"}`}
                style={{ ...textInputStyle, opacity: row.is_working ? 1 : 0.4 }}
              />
            </div>
          );
        })}
      </div>

      {/* Timeline visualization */}
      {rows.length > 0 && (
        <div style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
          borderRadius: 16,
          padding: 20,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--a-text)", marginBottom: 16, margin: "0 0 16px" }}>
            Візуальний графік
          </h3>

          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <TimelineBar key={row.id} row={row} />
            ))}
          </div>

          {/* Time labels */}
          <div className="flex justify-between" style={{ marginTop: 8, paddingLeft: 44 }}>
            {["00:00", "06:00", "12:00", "18:00", "24:00"].map((t) => (
              <span key={t} style={{ fontSize: 10, color: "var(--a-text-5)", fontFamily: "'JetBrains Mono', monospace" }}>
                {t}
              </span>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5" style={{ marginTop: 14 }}>
            <div className="flex items-center gap-2">
              <div style={{ width: 12, height: 8, borderRadius: 4, background: "var(--a-accent)", opacity: 0.2 }} />
              <span style={{ fontSize: 11, color: "var(--a-text-4)" }}>AI (24/7)</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: 12, height: 8, borderRadius: 4, background: "#22c55e", opacity: 0.7 }} />
              <span style={{ fontSize: 11, color: "var(--a-text-4)" }}>Менеджери</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle                                                             */
/* ------------------------------------------------------------------ */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 38, height: 20, borderRadius: 10,
        border: "none", cursor: "pointer", position: "relative",
        background: checked ? "var(--a-accent)" : "var(--a-bg-hover)",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", position: "absolute", top: 2,
        left: checked ? 20 : 2,
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline Bar                                                       */
/* ------------------------------------------------------------------ */

function TimelineBar({ row }: { row: ScheduleRow }) {
  const parseTime = (t: string | null): number => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h + (m || 0) / 60;
  };

  const mgrStart = parseTime(row.managers_start);
  const mgrEnd = parseTime(row.managers_end);

  const mgrLeftPct = (mgrStart / 24) * 100;
  const mgrWidthPct = ((mgrEnd - mgrStart) / 24) * 100;

  return (
    <div className="flex items-center gap-3">
      <span style={{
        width: 32, fontSize: 11, fontWeight: 600,
        color: row.is_working ? "var(--a-text-3)" : "var(--a-text-5)",
        textAlign: "right", flexShrink: 0,
      }}>
        {DAY_SHORT[row.day_of_week - 1]}
      </span>

      <div style={{
        flex: 1, height: 8, borderRadius: 4, position: "relative",
        background: "var(--a-accent)",
        opacity: row.is_working ? 0.15 : 0.06,
      }}>
        {row.is_working && mgrWidthPct > 0 && (
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${mgrLeftPct}%`,
            width: `${mgrWidthPct}%`,
            borderRadius: 4,
            background: "#22c55e",
            opacity: 0.6,
          }} />
        )}
      </div>
    </div>
  );
}
