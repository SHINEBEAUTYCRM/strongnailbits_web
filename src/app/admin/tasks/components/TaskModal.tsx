"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Check, Plus, Loader2, Send,
  Calendar, User, Flag, Tag, Link2, RotateCw,
  MessageSquare, History, Trash2, Copy, MoreHorizontal, Archive,
} from "lucide-react";
import type {
  Task, ColumnId, Priority, TeamMemberShort,
  ChecklistItem, TaskComment, TaskActivity,
} from "@/types/tasks";
import { COLUMNS, PRIORITIES, AVAILABLE_TAGS } from "@/types/tasks";

interface TaskModalProps {
  task: Task;
  teamMembers: TeamMemberShort[];
  currentUserId: string;
  onClose: () => void;
  onUpdate: (taskId: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

const COLUMN_LABELS: Record<ColumnId, string> = {
  new: "Нові",
  progress: "В роботі",
  review: "Перевірка",
  done: "Готово",
};

export function TaskModal({ task, teamMembers, currentUserId, onClose, onUpdate, onDelete }: TaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [loadingChecklist, setLoadingChecklist] = useState(true);

  // Comments
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);

  // Activity
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Tags open
  const [showAllTags, setShowAllTags] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── URL update ──
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("task", task.id);
    window.history.replaceState({}, "", url.toString());
    return () => {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("task");
      window.history.replaceState({}, "", cleanUrl.toString());
    };
  }, [task.id]);

  // ── Close on Escape ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); handleDelete(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  // ── Load data on mount ──
  useEffect(() => {
    loadChecklist();
    loadComments();
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const loadChecklist = async () => {
    setLoadingChecklist(true);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/checklist`);
      if (res.ok) {
        const data = await res.json();
        setChecklist(Array.isArray(data) ? data : []);
      } else {
        setChecklist([]);
      }
    } catch { setChecklist([]); } finally { setLoadingChecklist(false); }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      } else {
        setComments([]);
      }
    } catch { setComments([]); } finally { setLoadingComments(false); }
  };

  const loadActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivity(Array.isArray(data) ? data : []);
      } else {
        setActivity([]);
      }
    } catch { setActivity([]); } finally { setLoadingActivity(false); }
  };

  // ── Save field with debounce ──
  const saveField = useCallback(
    async (field: string, value: unknown) => {
      setSaving(true);
      try {
        await onUpdate(task.id, { [field]: value, actor_id: currentUserId });
      } finally {
        setSaving(false);
      }
    },
    [task.id, currentUserId, onUpdate],
  );

  const debouncedSave = useCallback(
    (field: string, value: unknown) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveField(field, value), 500);
    },
    [saveField],
  );

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  // ── Title change ──
  const handleTitleChange = (val: string) => {
    setTitle(val);
    debouncedSave("title", val.trim());
  };

  // ── Description change ──
  const handleDescChange = (val: string) => {
    setDescription(val);
    debouncedSave("description", val);
  };

  // ── Checklist ──
  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newCheckItem.trim(), actor_id: currentUserId }),
      });
      if (res.ok) {
        const item = await res.json();
        setChecklist((prev) => [...prev, item]);
        setNewCheckItem("");
      }
    } catch { /* ignore */ }
  };

  const handleToggleCheckItem = async (item: ChecklistItem) => {
    setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    try {
      await fetch(`/api/admin/tasks/${task.id}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, done: !item.done }),
      });
    } catch {
      setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)));
    }
  };

  // ── Comments ──
  const handleAddComment = async () => {
    if (!newComment.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newComment.trim(), author_id: currentUserId }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
      }
    } catch { /* ignore */ } finally { setSendingComment(false); }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!window.confirm("Видалити задачу?")) return;
    await onDelete(task.id);
    onClose();
  };

  // ── Tags ──
  const handleTagToggle = (tag: string) => {
    const newTags = task.tags.includes(tag) ? task.tags.filter((t) => t !== tag) : [...task.tags, tag];
    saveField("tags", newTags);
  };

  // ── Copy ID ──
  const handleCopyId = () => {
    navigator.clipboard.writeText(task.id);
    setShowMenu(false);
  };

  // ── Duplicate ──
  const handleDuplicate = async () => {
    setShowMenu(false);
    try {
      await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${task.title} (копія)`,
          description: task.description,
          column_id: task.column_id,
          priority: task.priority,
          assignee_id: task.assignee_id,
          tags: task.tags,
          created_by: currentUserId,
        }),
      });
    } catch { /* ignore */ }
  };

  const checkDone = checklist.filter((c) => c.done).length;
  const checkTotal = checklist.length;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxWidth: 780,
          maxHeight: "90vh",
          background: "var(--a-bg)",
          border: "1px solid var(--a-border)",
          animation: "fadeScaleIn 0.15s ease-out",
        }}
      >
        {/* ──────── Header ──────── */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ borderBottom: "1px solid var(--a-border)" }}
        >
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#a855f7" }} />}
            <span className="text-[10px] font-mono" style={{ color: "var(--a-text-4)" }}>
              {task.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Three-dot menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: "var(--a-text-4)" }}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-8 rounded-lg py-1 min-w-[160px] z-50"
                  style={{
                    background: "var(--a-bg-card)",
                    border: "1px solid var(--a-border)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  }}
                >
                  <button
                    onClick={handleCopyId}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                    style={{ color: "var(--a-text-2)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Copy className="w-3.5 h-3.5" /> Копіювати ID
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                    style={{ color: "var(--a-text-2)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Archive className="w-3.5 h-3.5" /> Дублювати
                  </button>
                  <div style={{ borderTop: "1px solid var(--a-border)", margin: "4px 0" }} />
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                    style={{ color: "#ef4444" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Видалити
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "var(--a-text-4)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--a-text-body)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-4)"; }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ──────── Two-column body ──────── */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: "75vh" }}>
          <div className="flex flex-col md:flex-row">
            {/* ── Left column (60%) ── */}
            <div className="flex-1 md:w-[60%] px-5 py-4 space-y-5" style={{ borderRight: "1px solid var(--a-border)" }}>
              {/* Title */}
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-lg font-semibold"
                style={{ color: "var(--a-text-body)" }}
                placeholder="Назва задачі"
              />

              {/* Description */}
              <div>
                <textarea
                  value={description}
                  onChange={(e) => handleDescChange(e.target.value)}
                  placeholder="Додай опис..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{
                    background: "var(--a-bg-card)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text-body)",
                  }}
                />
              </div>

              {/* ── Checklist ── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-3.5 h-3.5" style={{ color: "var(--a-text-4)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>Чеклист</span>
                  {checkTotal > 0 && (
                    <>
                      <span className="text-[10px] font-mono" style={{ color: "var(--a-text-4)" }}>
                        {checkDone}/{checkTotal}
                      </span>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--a-bg-hover)", maxWidth: 80 }}>
                        <div className="h-full rounded-full" style={{ width: `${checkTotal > 0 ? (checkDone / checkTotal) * 100 : 0}%`, background: "#22c55e" }} />
                      </div>
                    </>
                  )}
                </div>
                {loadingChecklist ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--a-text-4)" }} />
                ) : (
                  <div className="flex flex-col gap-1">
                    {checklist.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer"
                        style={{ background: "var(--a-bg-hover)" }}
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => handleToggleCheckItem(item)}
                          className="accent-purple-500"
                        />
                        <span
                          className="text-sm"
                          style={{
                            color: item.done ? "var(--a-text-4)" : "var(--a-text-body)",
                            textDecoration: item.done ? "line-through" : "none",
                          }}
                        >
                          {item.text}
                        </span>
                      </label>
                    ))}
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        value={newCheckItem}
                        onChange={(e) => setNewCheckItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCheckItem(); } }}
                        placeholder="Додати пункт..."
                        className="flex-1 px-2 py-1.5 rounded-lg text-sm bg-transparent outline-none"
                        style={{ color: "var(--a-text-body)", border: "1px solid var(--a-border)" }}
                      />
                      <button onClick={handleAddCheckItem} className="p-1 rounded" style={{ color: "var(--a-text-3)" }}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Comments ── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3.5 h-3.5" style={{ color: "var(--a-text-4)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>Коментарі</span>
                </div>
                {loadingComments ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--a-text-4)" }} />
                ) : (
                  <div className="flex flex-col gap-3">
                    {comments.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--a-text-4)" }}>Поки немає коментарів</p>
                    )}
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-2.5">
                        <div
                          className="shrink-0 flex items-center justify-center text-[9px] font-bold uppercase"
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: "rgba(168,85,247,0.12)",
                            color: "#a855f7",
                          }}
                        >
                          {(c.author?.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: "var(--a-text-body)" }}>
                              {c.author?.name || "Невідомий"}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--a-text-4)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
                              {formatRelativeTime(c.created_at)}
                            </span>
                          </div>
                          <p className="text-sm mt-0.5" style={{ color: "var(--a-text-2)" }}>{c.text}</p>
                        </div>
                      </div>
                    ))}
                    {/* Comment input */}
                    <div className="flex items-center gap-2">
                      <input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleAddComment(); }
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); }
                        }}
                        placeholder="Написати коментар..."
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{
                          background: "var(--a-bg-card)",
                          border: "1px solid var(--a-border)",
                          color: "var(--a-text-body)",
                        }}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || sendingComment}
                        className="p-2 rounded-lg transition-colors disabled:opacity-40"
                        style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7" }}
                      >
                        {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right sidebar (40%) ── */}
            <div className="md:w-[40%] px-5 py-4 space-y-4">
              {/* Status */}
              <SidebarField icon={<Flag className="w-3.5 h-3.5" />} label="Статус">
                <div className="flex flex-wrap gap-1">
                  {COLUMNS.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => saveField("column_id", col.id)}
                      className="px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                      style={{
                        background: task.column_id === col.id ? `${col.color}18` : "var(--a-bg-card)",
                        border: `1px solid ${task.column_id === col.id ? `${col.color}40` : "var(--a-border)"}`,
                        color: task.column_id === col.id ? col.color : "var(--a-text-3)",
                      }}
                    >
                      {col.icon} {col.label}
                    </button>
                  ))}
                </div>
              </SidebarField>

              {/* Priority */}
              <SidebarField icon={<Flag className="w-3.5 h-3.5" />} label="Пріоритет">
                <div className="flex flex-wrap gap-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => saveField("priority", p.id)}
                      className="px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                      style={{
                        background: task.priority === p.id ? `${p.color}18` : "var(--a-bg-card)",
                        border: `1px solid ${task.priority === p.id ? `${p.color}40` : "var(--a-border)"}`,
                        color: task.priority === p.id ? p.color : "var(--a-text-3)",
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, display: "inline-block", marginRight: 4 }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </SidebarField>

              {/* Assignee */}
              <SidebarField icon={<User className="w-3.5 h-3.5" />} label="Виконавець">
                <select
                  value={task.assignee_id || ""}
                  onChange={(e) => saveField("assignee_id", e.target.value || null)}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                  style={{
                    background: "var(--a-bg-card)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text-body)",
                  }}
                >
                  <option value="">Не призначено</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </SidebarField>

              {/* Due date */}
              <SidebarField icon={<Calendar className="w-3.5 h-3.5" />} label="Дедлайн">
                <input
                  type="date"
                  value={task.due_date || ""}
                  onChange={(e) => saveField("due_date", e.target.value || null)}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--a-bg-card)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text-body)",
                  }}
                />
              </SidebarField>

              {/* Tags */}
              <SidebarField icon={<Tag className="w-3.5 h-3.5" />} label="Теги">
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                      style={{
                        background: "rgba(168,85,247,0.12)",
                        border: "1px solid rgba(168,85,247,0.25)",
                        color: "#a78bfa",
                      }}
                    >
                      {tag} ×
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="px-2 py-0.5 rounded-md text-[10px]"
                    style={{
                      background: "var(--a-bg-hover)",
                      color: "var(--a-text-3)",
                      border: "1px solid var(--a-border)",
                    }}
                  >
                    +
                  </button>
                </div>
                {showAllTags && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {AVAILABLE_TAGS.filter((t) => !task.tags.includes(t)).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className="px-1.5 py-0.5 rounded text-[10px] transition-colors"
                        style={{
                          background: "var(--a-bg-card)",
                          color: "var(--a-text-4)",
                          border: "1px solid var(--a-border)",
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </SidebarField>

              {/* Linked order */}
              {task.linked_order && (
                <SidebarField icon={<Link2 className="w-3.5 h-3.5" />} label="Замовлення">
                  <span className="text-xs font-mono" style={{ color: "#a855f7" }}>
                    #{task.linked_order.replace(/\D/g, "")}
                  </span>
                </SidebarField>
              )}

              {/* Recurring */}
              {task.recurring && (
                <SidebarField icon={<RotateCw className="w-3.5 h-3.5" />} label="Повторення">
                  <span className="text-xs" style={{ color: "#a78bfa" }}>
                    {task.recurring.label}
                  </span>
                </SidebarField>
              )}

              {/* Created */}
              <SidebarField icon={<Calendar className="w-3.5 h-3.5" />} label="Створено">
                <span className="text-xs font-mono" style={{ color: "var(--a-text-4)" }}>
                  {formatDate(task.created_at)}
                </span>
              </SidebarField>
            </div>
          </div>

          {/* ──────── Activity Log (bottom) ──────── */}
          <div
            className="px-5 py-3"
            style={{ borderTop: "1px solid var(--a-border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <History className="w-3.5 h-3.5" style={{ color: "var(--a-text-4)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>Лог активності</span>
            </div>
            {loadingActivity ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--a-text-4)" }} />
            ) : activity.length === 0 ? (
              <p className="text-[11px]" style={{ color: "var(--a-text-4)" }}>Поки немає активності</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto">
                {activity.map((a) => {
                  let detail = ACTION_LABELS[a.action] || a.action;
                  if (a.action === "moved" && a.details) {
                    const d = a.details as Record<string, string>;
                    const from = COLUMN_LABELS[d.from as ColumnId] || d.from;
                    const to = COLUMN_LABELS[d.to as ColumnId] || d.to;
                    detail = `перемістив ${from} → ${to}`;
                  }

                  return (
                    <div key={a.id} className="flex items-center gap-2">
                      <span
                        className="w-1 h-1 rounded-full shrink-0"
                        style={{ background: "var(--a-text-4)" }}
                      />
                      <span className="text-[11px]" style={{ color: "var(--a-text-2)" }}>
                        <span style={{ fontWeight: 500, color: "var(--a-text-body)" }}>
                          {a.actor?.name || "Система"}
                        </span>{" "}
                        {detail}
                      </span>
                      <span
                        className="text-[10px] ml-auto shrink-0"
                        style={{ color: "var(--a-text-4)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
                      >
                        {formatRelativeTime(a.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ──── Sidebar Field ────
// ═══════════════════════════════════════

function SidebarField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color: "var(--a-text-4)" }}>{icon}</span>
        <span className="text-[11px] font-medium" style={{ color: "var(--a-text-3)" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════
// ──── Helpers ────
// ═══════════════════════════════════════

const ACTION_LABELS: Record<string, string> = {
  created: "створив задачу",
  moved: "перемістив",
  assigned: "призначив",
  comment: "додав коментар",
  checklist: "оновив чеклист",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "щойно";
  if (mins < 60) return `${mins} хв`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} год`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн`;
  return formatDate(iso);
}
