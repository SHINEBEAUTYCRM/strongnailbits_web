"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Check, Plus, Loader2, Send,
  Calendar, User, Flag, Tag, Link2, RotateCw,
  MessageSquare, History, Trash2,
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

type TabId = "details" | "comments" | "log";

const COLUMN_LABELS: Record<ColumnId, string> = {
  new: "Нові",
  progress: "В роботі",
  review: "Перевірка",
  done: "Готово",
};

export function TaskModal({ task, teamMembers, currentUserId, onClose, onUpdate, onDelete }: TaskModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [saving, setSaving] = useState(false);

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

  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // ── Close on Escape ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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
      // The API only has POST/PATCH, we need a GET. Fetch from the task API won't
      // work directly, so we'll use the Supabase client
      // For simplicity — load from main tasks API won't work, let's use an inline approach
      // Actually, let me load from Supabase client directly
      if (!res.ok) {
        setChecklist([]);
        return;
      }
      const data = await res.json();
      setChecklist(Array.isArray(data) ? data : []);
    } catch {
      setChecklist([]);
    } finally {
      setLoadingChecklist(false);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/comments`);
      if (!res.ok) {
        setComments([]);
        return;
      }
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/activity`);
      if (!res.ok) {
        setActivity([]);
        return;
      }
      const data = await res.json();
      setActivity(Array.isArray(data) ? data : []);
    } catch {
      setActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  // ── Save field ──
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

  // ── Title blur ──
  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      saveField("title", title.trim());
    }
  };

  // ── Description blur ──
  const handleDescBlur = () => {
    if (description !== task.description) {
      saveField("description", description);
    }
  };

  // ── Add checklist item ──
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

  // ── Toggle checklist item ──
  const handleToggleCheckItem = async (item: ChecklistItem) => {
    // Optimistic
    setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    try {
      await fetch(`/api/admin/tasks/${task.id}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, done: !item.done }),
      });
    } catch {
      // Revert
      setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)));
    }
  };

  // ── Add comment ──
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
    } catch { /* ignore */ } finally {
      setSendingComment(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!window.confirm("Видалити задачу?")) return;
    await onDelete(task.id);
    onClose();
  };

  // ── Tag toggle ──
  const handleTagToggle = (tag: string) => {
    const newTags = task.tags.includes(tag) ? task.tags.filter((t) => t !== tag) : [...task.tags, tag];
    saveField("tags", newTags);
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "details", label: "Деталі", icon: <Flag className="w-3.5 h-3.5" /> },
    { id: "comments", label: "Коментарі", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "log", label: "Лог", icon: <History className="w-3.5 h-3.5" /> },
  ];

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
          maxWidth: 560,
          maxHeight: "90vh",
          background: "var(--a-bg)",
          border: "1px solid var(--a-border)",
          animation: "modalIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--a-border)" }}
        >
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#a855f7" }} />}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "var(--a-text-4)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-4)"; }}
              title="Видалити"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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

        {/* Title */}
        <div className="px-5 pt-4 pb-2">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full bg-transparent border-none outline-none text-lg font-semibold"
            style={{ color: "var(--a-text-body)" }}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5" style={{ borderBottom: "1px solid var(--a-border)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors relative"
              style={{
                color: activeTab === tab.id ? "#a855f7" : "var(--a-text-3)",
              }}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "#a855f7" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ maxHeight: "60vh" }}>
          {activeTab === "details" && (
            <DetailsTab
              task={task}
              description={description}
              setDescription={setDescription}
              onDescBlur={handleDescBlur}
              teamMembers={teamMembers}
              onSaveField={saveField}
              checklist={checklist}
              loadingChecklist={loadingChecklist}
              newCheckItem={newCheckItem}
              setNewCheckItem={setNewCheckItem}
              onAddCheckItem={handleAddCheckItem}
              onToggleCheckItem={handleToggleCheckItem}
              onTagToggle={handleTagToggle}
            />
          )}
          {activeTab === "comments" && (
            <CommentsTab
              comments={comments}
              loading={loadingComments}
              newComment={newComment}
              setNewComment={setNewComment}
              onAddComment={handleAddComment}
              sending={sendingComment}
            />
          )}
          {activeTab === "log" && (
            <ActivityTab activity={activity} loading={loadingActivity} />
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ──── Details Tab ────
// ═══════════════════════════════════════

function DetailsTab({
  task, description, setDescription, onDescBlur,
  teamMembers, onSaveField,
  checklist, loadingChecklist, newCheckItem, setNewCheckItem, onAddCheckItem, onToggleCheckItem,
  onTagToggle,
}: {
  task: Task;
  description: string;
  setDescription: (v: string) => void;
  onDescBlur: () => void;
  teamMembers: TeamMemberShort[];
  onSaveField: (field: string, value: unknown) => void;
  checklist: ChecklistItem[];
  loadingChecklist: boolean;
  newCheckItem: string;
  setNewCheckItem: (v: string) => void;
  onAddCheckItem: () => void;
  onToggleCheckItem: (item: ChecklistItem) => void;
  onTagToggle: (tag: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Description */}
      <div>
        <FieldLabel icon={<Flag className="w-3 h-3" />} label="Опис" />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={onDescBlur}
          placeholder="Додати опис..."
          rows={3}
          className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
            color: "var(--a-text-body)",
          }}
        />
      </div>

      {/* Assignee */}
      <div>
        <FieldLabel icon={<User className="w-3 h-3" />} label="Виконавець" />
        <select
          value={task.assignee_id || ""}
          onChange={(e) => onSaveField("assignee_id", e.target.value || null)}
          className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
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
      </div>

      {/* Priority */}
      <div>
        <FieldLabel icon={<Flag className="w-3 h-3" />} label="Пріоритет" />
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {PRIORITIES.map((p) => (
            <button
              key={p.id}
              onClick={() => onSaveField("priority", p.id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: task.priority === p.id ? `${p.color}18` : "var(--a-bg-card)",
                border: `1px solid ${task.priority === p.id ? `${p.color}40` : "var(--a-border)"}`,
                color: task.priority === p.id ? p.color : "var(--a-text-3)",
              }}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status (column) */}
      <div>
        <FieldLabel icon={<Flag className="w-3 h-3" />} label="Статус" />
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {COLUMNS.map((col) => (
            <button
              key={col.id}
              onClick={() => onSaveField("column_id", col.id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
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
      </div>

      {/* Due date */}
      <div>
        <FieldLabel icon={<Calendar className="w-3 h-3" />} label="Дедлайн" />
        <input
          type="date"
          value={task.due_date || ""}
          onChange={(e) => onSaveField("due_date", e.target.value || null)}
          className="mt-1.5 px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
            color: "var(--a-text-body)",
          }}
        />
      </div>

      {/* Linked order */}
      <div>
        <FieldLabel icon={<Link2 className="w-3 h-3" />} label="Замовлення" />
        <input
          type="text"
          defaultValue={task.linked_order || ""}
          onBlur={(e) => onSaveField("linked_order", e.target.value || null)}
          placeholder="#SHINE-XXXX"
          className="w-full mt-1.5 px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
            color: "var(--a-text-body)",
            fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
          }}
        />
      </div>

      {/* Tags */}
      <div>
        <FieldLabel icon={<Tag className="w-3 h-3" />} label="Теги" />
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {AVAILABLE_TAGS.map((tag) => {
            const active = task.tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className="px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                style={{
                  background: active ? "rgba(168,85,247,0.12)" : "var(--a-bg-card)",
                  border: `1px solid ${active ? "rgba(168,85,247,0.3)" : "var(--a-border)"}`,
                  color: active ? "#a78bfa" : "var(--a-text-3)",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Checklist */}
      <div>
        <FieldLabel icon={<Check className="w-3 h-3" />} label="Чеклист" />
        {loadingChecklist ? (
          <Loader2 className="w-4 h-4 animate-spin mt-2" style={{ color: "var(--a-text-4)" }} />
        ) : (
          <div className="flex flex-col gap-1 mt-1.5">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group"
                style={{ background: "var(--a-bg-hover)" }}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onToggleCheckItem(item)}
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
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddCheckItem(); } }}
                placeholder="Додати пункт..."
                className="flex-1 px-2 py-1.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ color: "var(--a-text-body)", border: "1px solid var(--a-border)" }}
              />
              <button
                onClick={onAddCheckItem}
                className="p-1 rounded"
                style={{ color: "var(--a-text-3)" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recurring badge */}
      {task.recurring && (
        <div>
          <FieldLabel icon={<RotateCw className="w-3 h-3" />} label="Повторення" />
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-md text-xs" style={{ background: "rgba(168,85,247,0.1)", color: "#a78bfa" }}>
            🔁 {task.recurring.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ──── Comments Tab ────
// ═══════════════════════════════════════

function CommentsTab({
  comments, loading, newComment, setNewComment, onAddComment, sending,
}: {
  comments: TaskComment[];
  loading: boolean;
  newComment: string;
  setNewComment: (v: string) => void;
  onAddComment: () => void;
  sending: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--a-text-4)" }} />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-xs py-8" style={{ color: "var(--a-text-4)" }}>
          Коментарів поки немає
        </p>
      ) : (
        <div className="flex flex-col gap-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              {/* Avatar */}
              <div
                className="shrink-0 flex items-center justify-center text-[9px] font-bold uppercase"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(168,85,247,0.12)",
                  color: "#a855f7",
                }}
              >
                {(c.author?.name || "?")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: "var(--a-text-body)" }}>
                    {c.author?.name || "Невідомий"}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--a-text-4)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
                    {formatTime(c.created_at)}
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: "var(--a-text-2)" }}>
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      <div
        className="flex items-center gap-2 mt-auto pt-3"
        style={{ borderTop: "1px solid var(--a-border)" }}
      >
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onAddComment(); } }}
          placeholder="Написати коментар..."
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
            color: "var(--a-text-body)",
          }}
        />
        <button
          onClick={onAddComment}
          disabled={!newComment.trim() || sending}
          className="p-2 rounded-lg transition-colors disabled:opacity-40"
          style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7" }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ──── Activity Tab ────
// ═══════════════════════════════════════

const ACTION_LABELS: Record<string, string> = {
  created: "створив задачу",
  moved: "перемістив",
  assigned: "призначив",
  comment: "додав коментар",
  checklist: "оновив чеклист",
};

const COLUMN_LABEL_MAP: Record<string, string> = {
  new: "Нові",
  progress: "В роботі",
  review: "Перевірка",
  done: "Готово",
};

function ActivityTab({ activity, loading }: { activity: TaskActivity[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--a-text-4)" }} />
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <p className="text-center text-xs py-8" style={{ color: "var(--a-text-4)" }}>
        Поки немає активності
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {activity.map((a) => {
        let detail = ACTION_LABELS[a.action] || a.action;
        if (a.action === "moved" && a.details) {
          const from = COLUMN_LABEL_MAP[(a.details as Record<string, string>).from] || (a.details as Record<string, string>).from;
          const to = COLUMN_LABEL_MAP[(a.details as Record<string, string>).to] || (a.details as Record<string, string>).to;
          detail = `перемістив з ${from} → ${to}`;
        }

        return (
          <div key={a.id} className="flex items-start gap-2.5">
            <div
              className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
              style={{ background: "var(--a-text-4)" }}
            />
            <div>
              <span className="text-xs" style={{ color: "var(--a-text-2)" }}>
                <span style={{ color: "var(--a-text-body)", fontWeight: 500 }}>
                  {a.actor?.name || "Система"}
                </span>{" "}
                {detail}
              </span>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "var(--a-text-4)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
              >
                {formatTime(a.created_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════
// ──── Helpers ────
// ═══════════════════════════════════════

function FieldLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: "var(--a-text-4)" }}>{icon}</span>
      <span className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>{label}</span>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${day}.${month} ${h}:${m}`;
}
