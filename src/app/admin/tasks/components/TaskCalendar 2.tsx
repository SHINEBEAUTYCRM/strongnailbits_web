"use client";

import { useMemo } from "react";
import type { Task } from "@/types/tasks";
import { PRIORITIES } from "@/types/tasks";

interface TaskCalendarProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export function TaskCalendar({ tasks, onTaskClick }: TaskCalendarProps) {
  const { weeks, today } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Start from Monday of current week
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + mondayOffset);

    // Generate 3 weeks
    const weeksArr: { date: Date; dateStr: string; tasks: Task[] }[][] = [];
    const current = new Date(startDate);

    for (let w = 0; w < 3; w++) {
      const week: { date: Date; dateStr: string; tasks: Task[] }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().split("T")[0];
        const dayTasks = tasks.filter((t) => t.due_date === dateStr);
        week.push({ date: new Date(current), dateStr, tasks: dayTasks });
        current.setDate(current.getDate() + 1);
      }
      weeksArr.push(week);
    }

    return { weeks: weeksArr, today: todayStr };
  }, [tasks]);

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold py-1.5"
            style={{ color: "var(--a-text-4)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day) => {
            const isToday = day.dateStr === today;
            const isPast = day.dateStr < today;

            return (
              <div
                key={day.dateStr}
                className="rounded-lg p-1.5"
                style={{
                  minHeight: 80,
                  background: isToday ? "rgba(168,85,247,0.06)" : "var(--a-bg-hover)",
                  border: `1px solid ${isToday ? "rgba(168,85,247,0.2)" : "var(--a-border)"}`,
                  opacity: isPast ? 0.5 : 1,
                }}
              >
                {/* Day number */}
                <div
                  className="text-xs font-medium mb-1"
                  style={{
                    color: isToday ? "#a855f7" : "var(--a-text-3)",
                    fontFamily: "var(--font-jetbrains-mono, monospace)",
                  }}
                >
                  {day.date.getDate()}
                </div>

                {/* Tasks */}
                <div className="flex flex-col gap-0.5">
                  {day.tasks.slice(0, 3).map((t) => {
                    const p = PRIORITIES.find((pr) => pr.id === t.priority);
                    return (
                      <button
                        key={t.id}
                        onClick={() => onTaskClick(t)}
                        className="w-full text-left px-1 py-0.5 rounded text-[10px] truncate transition-colors"
                        style={{
                          background: `${p?.color || "#6366f1"}12`,
                          color: p?.color || "#6366f1",
                          border: `1px solid ${p?.color || "#6366f1"}20`,
                        }}
                        title={t.title}
                      >
                        {t.title}
                      </button>
                    );
                  })}
                  {day.tasks.length > 3 && (
                    <span className="text-[10px] px-1" style={{ color: "var(--a-text-4)" }}>
                      +{day.tasks.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
