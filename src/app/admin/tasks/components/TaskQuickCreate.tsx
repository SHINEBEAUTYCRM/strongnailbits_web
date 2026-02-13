"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import type { ColumnId } from "@/types/tasks";

interface TaskQuickCreateProps {
  columnId: ColumnId;
  onSubmit: (title: string, columnId: ColumnId) => void;
}

export function TaskQuickCreate({ columnId, onSubmit }: TaskQuickCreateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed, columnId);
      setValue("");
    }
    setIsOpen(false);
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
        onBlur={handleSubmit}
        placeholder="Назва задачі..."
        className="w-full bg-transparent border-none outline-none text-sm"
        style={{ color: "var(--a-text-body)" }}
      />
    </div>
  );
}
