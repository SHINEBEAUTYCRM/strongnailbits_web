"use client";

import { memo } from "react";
import { MessageSquare, Paperclip, RotateCw, CheckSquare } from "lucide-react";
import type { Task } from "@/types/tasks";
import { PRIORITIES } from "@/types/tasks";

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export const TaskCard = memo(function TaskCard({ task, onClick }: TaskCardProps) {
  const priority = PRIORITIES.find((p) => p.id === task.priority);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.column_id !== "done";
  const isToday =
    task.due_date &&
    new Date(task.due_date).toDateString() === new Date().toDateString();

  const hasChecklist = (task.checklist_total ?? 0) > 0;
  const visibleTags = task.tags.slice(0, 2);
  const extraTags = task.tags.length - 2;

  return (
    <div
      onClick={() => onClick(task)}
      className="group cursor-pointer select-none"
      style={{
        background: "var(--a-bg-card)",
        border: "1px solid var(--a-border)",
        borderRadius: 8,
        padding: "10px 12px",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(168,85,247,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--a-border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        {/* Priority dot */}
        <span
          className="shrink-0 mt-1"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: priority?.color || "var(--a-text-3)",
            display: "inline-block",
          }}
        />
        <span
          className="text-sm font-medium leading-snug line-clamp-2"
          style={{ color: "var(--a-text-body)" }}
        >
          {task.title}
        </span>
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(168,85,247,0.1)",
                color: "#a78bfa",
              }}
            >
              {tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "var(--a-bg-hover)", color: "var(--a-text-3)" }}
            >
              +{extraTags}
            </span>
          )}
        </div>
      )}

      {/* Bottom meta row */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-2.5">
          {/* Assignee avatar */}
          {task.assignee && (
            <div
              className="flex items-center justify-center text-[9px] font-bold uppercase"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "rgba(168,85,247,0.15)",
                color: "#a855f7",
              }}
              title={task.assignee.name}
            >
              {task.assignee.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </div>
          )}

          {/* Checklist progress */}
          {hasChecklist && (
            <span
              className="flex items-center gap-1 text-[11px]"
              style={{
                color: task.checklist_done === task.checklist_total ? "#22c55e" : "var(--a-text-3)",
              }}
            >
              <CheckSquare className="w-3 h-3" />
              {task.checklist_done}/{task.checklist_total}
            </span>
          )}

          {/* Comments count */}
          {(task.comments_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--a-text-3)" }}>
              <MessageSquare className="w-3 h-3" />
              {task.comments_count}
            </span>
          )}

          {/* Attachments count */}
          {(task.attachments_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--a-text-3)" }}>
              <Paperclip className="w-3 h-3" />
              {task.attachments_count}
            </span>
          )}

          {/* Recurring icon */}
          {task.recurring && (
            <RotateCw className="w-3 h-3" style={{ color: "var(--a-text-3)" }} />
          )}

          {/* Linked order */}
          {task.linked_order && (
            <span
              className="text-[11px] font-mono"
              style={{ color: "#a855f7" }}
              onClick={(e) => {
                e.stopPropagation();
                const num = task.linked_order?.replace(/\D/g, "");
                if (num) window.open(`/admin/orders/${num}`, "_blank");
              }}
            >
              #{task.linked_order.replace(/\D/g, "")}
            </span>
          )}
        </div>

        {/* Due date */}
        {task.due_date && (
          <span
            className="text-[11px]"
            style={{
              fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
              color: isOverdue ? "#ef4444" : isToday ? "#f59e0b" : "var(--a-text-4)",
            }}
          >
            {formatShortDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
});

function formatShortDate(date: string): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month}`;
}
