"use client";

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import type { ColumnId, Priority } from "@/types/tasks";
import { PRIORITIES } from "@/types/tasks";

interface TaskQuickCreateProps {
  columnId: ColumnId;
  onSubmit: (title: string, columnId: ColumnId, priority?: Priority) => void;
}

export function TaskQuickCreate({ columnId, onSubmit }: TaskQuickCreateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed, columnId, priority);
      setValue("");
      // Keep input open for the next task
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setValue("");
      setIsOpen(false);
    }
  };

  const cyclePriority = () => {
    const ids: Priority[] = ["low", "medium", "high", "urgent"];
    const idx = ids.indexOf(priority);
    setPriority(ids[(idx + 1) % ids.length]);
  };

  const currentPriority = PRIORITIES.find((p) => p.id === priority);

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
        style={{ color: "var(--a-text-4)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--a-bg-hover)";
          e.currentTarget.style.color = "var(--a-text-2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--a-text-4)";
        }}
      >
        <Plus className="w-3.5 h-3.5" />
        Нова задача
      </button>
    );
  }

  return (
    <div
      className="rounded-lg"
      style={{
        background: "var(--a-bg-card)",
        border: "1px solid rgba(168,85,247,0.3)",
        padding: 8,
      }}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Назва задачі..."
        className="w-full bg-transparent border-none outline-none text-sm"
        style={{ color: "var(--a-text-body)" }}
      />
      <div className="flex items-center justify-between mt-1.5">
        <button
          onClick={cyclePriority}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors"
          style={{
            color: currentPriority?.color || "var(--a-text-4)",
            background: "var(--a-bg-hover)",
          }}
          title="Змінити пріоритет"
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: currentPriority?.color || "var(--a-text-3)",
              display: "inline-block",
            }}
          />
          {currentPriority?.label}
        </button>
        <span className="text-[10px]" style={{ color: "var(--a-text-4)" }}>
          Enter ↵
        </span>
      </div>
    </div>
  );
}
