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

export function TaskCreateModal({ open, onClose, defaultColumn }: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState<ColumnId>(defaultColumn || "new");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberShort[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  /* Reset fields + load team on open */
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setColumnId(defaultColumn || "new");
    setPriority("medium");
    setAssigneeId("");
    setDueDate("");
    setTags([]);
    setSubmitting(false);

    setTimeout(() => titleRef.current?.focus(), 100);

    const supabase = createAdminBrowserClient();
    supabase
      .from("team_members")
      .select("id, name, avatar_url")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setTeamMembers(data);
      });
  }, [open, defaultColumn]);

  /* Keyboard: Escape close, Cmd+Enter submit */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, title, description, columnId, priority, assigneeId, dueDate, tags]);

  const toggleTag = useCallback((tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);

    try {
      let createdBy = "";
      try {
        const meRes = await fetch("/api/admin/auth/me");
        if (meRes.ok) {
          const me = await meRes.json();
          createdBy = me.id || "";
        }
      } catch {
        /* ignore */
      }

      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          column_id: columnId,
          priority,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
          tags,
          created_by: createdBy || null,
        }),
      });

      if (res.ok) {
        onClose();
        window.dispatchEvent(new CustomEvent("task-created"));
      }
    } catch (err) {
      console.error("[TaskCreate] Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    background: "var(--a-bg-input)",
    border: "1px solid var(--a-border)",
    borderRadius: 12,
    padding: "10px 14px",
    color: "var(--a-text)",
    fontSize: 13,
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: "var(--a-text-3)",
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 4,
    display: "block",
  };

  const selectWrapStyle: React.CSSProperties = {
    position: "relative" as const,
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--a-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--a-text)" }}>
            Нова задача
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
            style={{ color: "var(--a-text-3)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3.5 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label style={labelStyle}>Назва *</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Що потрібно зробити?"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Опис</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Деталі задачі..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Row: Column + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Статус</label>
              <div style={selectWrapStyle}>
                <select
                  value={columnId}
                  onChange={(e) => setColumnId(e.target.value as ColumnId)}
                  style={inputStyle}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: "var(--a-text-4)" }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Пріоритет</label>
              <div style={selectWrapStyle}>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  style={inputStyle}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji} {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: "var(--a-text-4)" }}
                />
              </div>
            </div>
          </div>

          {/* Row: Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Виконавець</label>
              <div style={selectWrapStyle}>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Не призначено</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: "var(--a-text-4)" }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Дедлайн</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Теги</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors"
                    style={{
                      background: active ? "rgba(168,85,247,0.15)" : "var(--a-bg-hover)",
                      color: active ? "#a855f7" : "var(--a-text-3)",
                      border: `1px solid ${active ? "rgba(168,85,247,0.3)" : "var(--a-border)"}`,
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderTop: "1px solid var(--a-border)" }}
        >
          <span className="text-[11px]" style={{ color: "var(--a-text-5)" }}>
            ⌘ Enter — створити
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
              style={{
                background: "var(--a-bg-hover)",
                color: "var(--a-text-3)",
              }}
            >
              Скасувати
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity"
              style={{
                background: "linear-gradient(135deg, var(--a-accent), #ec4899)",
                opacity: !title.trim() || submitting ? 0.5 : 1,
                cursor: !title.trim() || submitting ? "default" : "pointer",
              }}
            >
              {submitting ? "Створюю…" : "Створити"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
