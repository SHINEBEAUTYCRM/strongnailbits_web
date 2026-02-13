"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { Task, TeamMemberShort } from "@/types/tasks";
import { PRIORITIES, COLUMNS } from "@/types/tasks";

interface TaskDashboardProps {
  tasks: Task[];
  teamMembers: TeamMemberShort[];
  onTaskClick: (task: Task) => void;
}

export function TaskDashboard({ tasks, teamMembers, onTaskClick }: TaskDashboardProps) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    // Per member workload
    const memberStats = teamMembers.map((m) => {
      const memberTasks = tasks.filter((t) => t.assignee_id === m.id);
      const done = memberTasks.filter((t) => t.column_id === "done").length;
      return { member: m, total: memberTasks.length, done };
    });

    // Priority counts (active only = not done)
    const active = tasks.filter((t) => t.column_id !== "done");
    const priorityCounts = PRIORITIES.map((p) => ({
      ...p,
      count: active.filter((t) => t.priority === p.id).length,
    }));

    // Overdue
    const overdue = tasks.filter(
      (t) => t.due_date && t.due_date < today && t.column_id !== "done",
    );

    // Column counts
    const columnCounts = COLUMNS.map((c) => ({
      ...c,
      count: tasks.filter((t) => t.column_id === c.id).length,
    }));

    return { memberStats, priorityCounts, overdue, columnCounts };
  }, [tasks, teamMembers]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Column distribution */}
      <DashCard title="Статуси">
        <div className="flex flex-col gap-2">
          {stats.columnCounts.map((col) => (
            <div key={col.id} className="flex items-center gap-3">
              <span style={{ color: col.color, fontSize: 12 }}>{col.icon}</span>
              <span className="text-xs flex-1" style={{ color: "var(--a-text-body)" }}>{col.label}</span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--a-text-2)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
              >
                {col.count}
              </span>
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--a-bg-hover)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${tasks.length ? (col.count / tasks.length) * 100 : 0}%`,
                    background: col.color,
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </DashCard>

      {/* Priority breakdown */}
      <DashCard title="Активні за пріоритетом">
        <div className="flex flex-col gap-2">
          {stats.priorityCounts.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-xs">{p.emoji}</span>
              <span className="text-xs flex-1" style={{ color: "var(--a-text-body)" }}>{p.label}</span>
              <span
                className="text-xs font-mono font-semibold"
                style={{ color: p.color, fontFamily: "var(--font-jetbrains-mono, monospace)" }}
              >
                {p.count}
              </span>
            </div>
          ))}
        </div>
      </DashCard>

      {/* Team workload */}
      <DashCard title="Навантаження команди">
        {stats.memberStats.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--a-text-4)" }}>Немає учасників</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {stats.memberStats.map((ms) => {
              const pct = ms.total > 0 ? (ms.done / ms.total) * 100 : 0;
              return (
                <div key={ms.member.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "var(--a-text-body)" }}>
                      {ms.member.name.split(" ")[0]}
                    </span>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "var(--a-text-3)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
                    >
                      {ms.done}/{ms.total}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--a-bg-hover)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? "#22c55e" : "#a855f7",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashCard>

      {/* Overdue */}
      <DashCard title="Прострочені" badge={stats.overdue.length > 0 ? stats.overdue.length : undefined}>
        {stats.overdue.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--a-text-4)" }}>Все вчасно 🎉</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {stats.overdue.slice(0, 5).map((t) => (
              <button
                key={t.id}
                onClick={() => onTaskClick(t)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs w-full transition-colors"
                style={{ background: "rgba(239,68,68,0.06)", color: "#fca5a5" }}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: "#ef4444" }} />
                <span className="truncate flex-1">{t.title}</span>
                <span
                  className="shrink-0 text-[10px] font-mono"
                  style={{ color: "#ef4444", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
                >
                  {t.due_date ? formatShortDate(t.due_date) : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </DashCard>
    </div>
  );
}

function DashCard({ title, badge, children }: { title: string; badge?: number; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--a-bg-card)",
        border: "1px solid var(--a-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-semibold" style={{ color: "var(--a-text-2)" }}>
          {title}
        </h3>
        {badge !== undefined && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
            style={{
              background: "rgba(239,68,68,0.12)",
              color: "#ef4444",
              fontFamily: "var(--font-jetbrains-mono, monospace)",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function formatShortDate(date: string): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month}`;
}
