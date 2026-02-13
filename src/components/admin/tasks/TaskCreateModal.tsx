"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { createAdminBrowserClient } from "@/lib/supabase/client";
import type { ColumnId, Priority, TeamMemberShort } from "@/types/tasks";
import { COLUMNS, PRIORITIES, AVAILABLE_TAGS } from "@/types/tasks";

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
  defaultColumn?: ColumnId;
}

export function TaskCreateModal({ open, onClose, defaultColumn = "new" }: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState<ColumnId>(defaultColumn);
  const [priority, setPriority] = useState<Priority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberShort[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showTags, setShowTags] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  // Load team members on open
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setColumnId(defaultColumn);
    setPriority("medium");
    setAssigneeId("");
    setDueDate("");
    setTags([]);
    setShowTags(false);
    setTimeout(() => titleRef.current?.focus(), 100);

    const supabase = createAdminBrowserClient();
    supabase
      .from("team_members")
      .select("id, name, avatar_url")
      .eq("is_active", true)
      .order("name")
      .then(({ data }: { data: TeamMemberShort[] | null }) => {
        if (data) setTeamMembers(data);
      });
  }, [open, defaultColumn]);

  // Keyboard: Escape, Cmd+Enter
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, description, columnId, priority, assigneeId, dueDate, tags]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);

    try {
      // Get current user
      const meRes = await fetch("/api/admin/auth/me");
      const me = meRes.ok ? await meRes.json() : {};

      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          column_id: columnId,
          priority,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
          tags,
          created_by: me.id || null,
        }),
      });

      if (res.ok) {
        onClose();
      }
    } catch (e) {
      console.error("Task create error:", e);
    } finally {
      setSubmitting(false);
    }
  }, [title, description, columnId, priority, assigneeId, dueDate, tags, submitting, onClose]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  if (!open) return null;

  const currentPriority = PRIORITIES.find((p) => p.id === priority);
  const currentColumn = COLUMNS.find((c) => c.id === columnId);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          animation: "fadeScaleIn 150ms ease-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-semibold" style={{ color: "var(--a-text)" }}>
            Нова задача
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--a-text-3)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-5 space-y-3">
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            placeholder="Назва задачі..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && title.trim()) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              background: "var(--a-bg-input)",
              border: "1px solid var(--a-border)",
              color: "var(--a-text)",
            }}
          />

          {/* Description */}
          <textarea
            placeholder="Додай опис..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
            style={{
              background: "var(--a-bg-input)",
              border: "1px solid var(--a-border)",
              color: "var(--a-text)",
            }}
          />

          {/* Status + Priority row */}
          <div className="flex gap-2">
            {/* Status */}
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider mb-1 block" style={{ color: "var(--a-text-4)" }}>
                Статус
              </label>
              <div className="relative">
                <select
                  value={columnId}
                  onChange={(e) => setColumnId(e.target.value as ColumnId)}
                  className="w-full appearance-none rounded-lg px-3 py-2 text-sm pr-8 cursor-pointer outline-none"
                  style={{
                    background: "var(--a-bg-input)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text)",
                  }}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--a-text-4)" }} />
              </div>
            </div>

            {/* Priority */}
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider mb-1 block" style={{ color: "var(--a-text-4)" }}>
                Пріоритет
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full appearance-none rounded-lg px-3 py-2 text-sm pr-8 cursor-pointer outline-none"
                  style={{
                    background: "var(--a-bg-input)",
                    border: "1px solid var(--a-border)",
                    color: currentPriority?.color || "var(--a-text)",
                  }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--a-text-4)" }} />
              </div>
            </div>
          </div>

          {/* Assignee + Due date row */}
          <div className="flex gap-2">
            {/* Assignee */}
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider mb-1 block" style={{ color: "var(--a-text-4)" }}>
                Виконавець
              </label>
              <div className="relative">
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full appearance-none rounded-lg px-3 py-2 text-sm pr-8 cursor-pointer outline-none"
                  style={{
                    background: "var(--a-bg-input)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text)",
                  }}
                >
                  <option value="">Без виконавця</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--a-text-4)" }} />
              </div>
            </div>

            {/* Due date */}
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider mb-1 block" style={{ color: "var(--a-text-4)" }}>
                Дедлайн
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--a-bg-input)",
                  border: "1px solid var(--a-border)",
                  color: dueDate ? "var(--a-text)" : "var(--a-text-4)",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--a-text-4)" }}>
              Теги
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                  style={{
                    background: "rgba(168,85,247,0.15)",
                    color: "#a855f7",
                    border: "1px solid rgba(168,85,247,0.25)",
                  }}
                >
                  {tag} ×
                </button>
              ))}
              <button
                onClick={() => setShowTags(!showTags)}
                className="rounded-md px-2.5 py-1 text-xs transition-colors"
                style={{
                  background: "var(--a-bg-input)",
                  color: "var(--a-text-3)",
                  border: "1px solid var(--a-border)",
                }}
              >
                +
              </button>
            </div>
            {showTags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {AVAILABLE_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="rounded-md px-2 py-0.5 text-[11px] transition-colors"
                    style={{
                      background: "var(--a-bg-hover)",
                      color: "var(--a-text-3)",
                      border: "1px solid var(--a-border)",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--a-border)" }} />

          {/* Submit */}
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--a-text-4)" }}>
              <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: "var(--a-bg-hover)" }}>⌘</kbd>+
              <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: "var(--a-bg-hover)" }}>Enter</kbd>
            </span>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40"
              style={{ background: "#a855f7" }}
            >
              {submitting ? "Створення..." : "Створити задачу"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
