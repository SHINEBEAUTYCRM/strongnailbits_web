"use client";

import { Search } from "lucide-react";
import type { Priority, TeamMemberShort } from "@/types/tasks";
import { PRIORITIES } from "@/types/tasks";

interface TaskFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  assigneeFilter: string | null;
  onAssigneeChange: (id: string | null) => void;
  priorityFilter: Priority | null;
  onPriorityChange: (p: Priority | null) => void;
  teamMembers: TeamMemberShort[];
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function TaskFilters({
  search,
  onSearchChange,
  assigneeFilter,
  onAssigneeChange,
  priorityFilter,
  onPriorityChange,
  teamMembers,
  searchInputRef,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative" style={{ minWidth: 180 }}>
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: "var(--a-text-4)" }}
        />
        <input
          ref={searchInputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Пошук..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none transition-colors"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
            color: "var(--a-text-body)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--a-border)";
          }}
        />
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: "var(--a-border)" }} />

      {/* Assignee filter */}
      <div className="flex items-center gap-1 flex-wrap">
        <FilterButton
          label="Всі"
          isActive={assigneeFilter === null}
          onClick={() => onAssigneeChange(null)}
        />
        {teamMembers.map((m) => (
          <FilterButton
            key={m.id}
            label={m.name.split(" ")[0]}
            isActive={assigneeFilter === m.id}
            onClick={() => onAssigneeChange(assigneeFilter === m.id ? null : m.id)}
          />
        ))}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: "var(--a-border)" }} />

      {/* Priority filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {PRIORITIES.map((p) => (
          <FilterButton
            key={p.id}
            label={`${p.emoji} ${p.label}`}
            isActive={priorityFilter === p.id}
            onClick={() => onPriorityChange(priorityFilter === p.id ? null : p.id)}
            activeColor={p.color}
          />
        ))}
      </div>
    </div>
  );
}

// ── Internal FilterButton ──

function FilterButton({
  label,
  isActive,
  onClick,
  activeColor,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap"
      style={{
        background: isActive
          ? activeColor
            ? `${activeColor}18`
            : "rgba(168,85,247,0.12)"
          : "transparent",
        color: isActive ? (activeColor || "#a855f7") : "var(--a-text-3)",
        border: `1px solid ${isActive ? (activeColor ? `${activeColor}30` : "rgba(168,85,247,0.2)") : "transparent"}`,
      }}
    >
      {label}
    </button>
  );
}
