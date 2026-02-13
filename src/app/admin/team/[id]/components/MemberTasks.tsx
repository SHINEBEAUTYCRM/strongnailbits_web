"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import type { Task } from "@/types/tasks";
import { COLUMNS, PRIORITIES } from "@/types/tasks";

interface MemberTasksProps {
  memberId: string;
  onTaskClick: (task: Task) => void;
}

export function MemberTasks({ memberId, onTaskClick }: MemberTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/tasks?assignee=${memberId}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#52525b" }} />
      </div>
    );
  }

  const active = tasks.filter((t) => t.column_id !== "done");
  const done = tasks.filter((t) => t.column_id === "done");

  return (
    <div className="flex flex-col gap-5">
      {/* Active */}
      <Section
        icon={<Clock className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />}
        title="Активні"
        count={active.length}
      >
        {active.length === 0 ? (
          <Empty text="Немає активних задач" />
        ) : (
          active.map((t) => <TaskRow key={t.id} task={t} onClick={() => onTaskClick(t)} />)
        )}
      </Section>

      {/* Done */}
      <Section
        icon={<CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />}
        title="Завершені"
        count={done.length}
      >
        {done.length === 0 ? (
          <Empty text="Немає завершених задач" />
        ) : (
          done.slice(0, 10).map((t) => <TaskRow key={t.id} task={t} onClick={() => onTaskClick(t)} />)
        )}
      </Section>
    </div>
  );
}

function Section({ icon, title, count, children }: {
  icon: React.ReactNode; title: string; count: number; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>{title}</span>
        <span className="text-[10px] font-mono" style={{ color: "#52525b", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>{count}</span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const priority = PRIORITIES.find((p) => p.id === task.priority);
  const col = COLUMNS.find((c) => c.id === task.column_id);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.column_id !== "done";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-xs"
      style={{ background: "rgba(255,255,255,0.02)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: priority?.color || "#71717a" }} />
      <span className="flex-1 truncate" style={{ color: "#d4d4d8" }}>{task.title}</span>
      {col && (
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${col.color}15`, color: col.color }}>
          {col.label}
        </span>
      )}
      {task.due_date && (
        <span
          className="text-[10px] font-mono shrink-0"
          style={{
            color: isOverdue ? "#ef4444" : "#52525b",
            fontFamily: "var(--font-jetbrains-mono, monospace)",
          }}
        >
          {formatShortDate(task.due_date)}
        </span>
      )}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs py-3 text-center" style={{ color: "#52525b" }}>{text}</p>;
}

function formatShortDate(date: string): string {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}
