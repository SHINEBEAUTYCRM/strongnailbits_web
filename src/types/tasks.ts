/* ------------------------------------------------------------------ */
/*  Kanban columns                                                     */
/* ------------------------------------------------------------------ */

export type ColumnId = "new" | "progress" | "review" | "done";

export interface KanbanColumn {
  id: ColumnId;
  label: string;
  color: string;
  icon: string; // ○ ◐ ◑ ●
}

export const COLUMNS: KanbanColumn[] = [
  { id: "new", label: "Нові", color: "#6366f1", icon: "○" },
  { id: "progress", label: "В роботі", color: "#f59e0b", icon: "◐" },
  { id: "review", label: "Перевірка", color: "#8b5cf6", icon: "◑" },
  { id: "done", label: "Готово", color: "#22c55e", icon: "●" },
];

/* ------------------------------------------------------------------ */
/*  Priority                                                           */
/* ------------------------------------------------------------------ */

export type Priority = "urgent" | "high" | "medium" | "low";

export interface PriorityMeta {
  id: Priority;
  label: string;
  color: string;
  emoji: string;
}

export const PRIORITIES: PriorityMeta[] = [
  { id: "urgent", label: "Терміново", color: "#ef4444", emoji: "🔴" },
  { id: "high", label: "Високий", color: "#f59e0b", emoji: "🟠" },
  { id: "medium", label: "Середній", color: "#6366f1", emoji: "🔵" },
  { id: "low", label: "Низький", color: "#71717a", emoji: "⚪" },
];

/* ------------------------------------------------------------------ */
/*  Tags                                                               */
/* ------------------------------------------------------------------ */

export const AVAILABLE_TAGS = [
  "фронтенд",
  "бекенд",
  "AI",
  "B2B",
  "інтеграція",
  "контент",
  "бот",
  "синк",
  "дизайн",
  "баг",
  "SEO",
  "маркетинг",
  "UX",
] as const;

export type TaskTag = (typeof AVAILABLE_TAGS)[number];

/* ------------------------------------------------------------------ */
/*  Recurring                                                          */
/* ------------------------------------------------------------------ */

export interface TaskRecurring {
  freq: "daily" | "weekly";
  label: string;
}

/* ------------------------------------------------------------------ */
/*  Task                                                               */
/* ------------------------------------------------------------------ */

export interface Task {
  id: string;
  title: string;
  description: string;
  column_id: ColumnId;
  assignee_id: string | null;
  priority: Priority;
  due_date: string | null;
  tags: string[];
  linked_order: string | null;
  recurring: TaskRecurring | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assignee?: TeamMemberShort | null;
  creator?: TeamMemberShort | null;
  checklist_total?: number;
  checklist_done?: number;
  comments_count?: number;
  attachments_count?: number;
}

/* ------------------------------------------------------------------ */
/*  Related entities                                                   */
/* ------------------------------------------------------------------ */

export interface TeamMemberShort {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  done: boolean;
  position: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  text: string;
  created_at: string;
  author?: TeamMemberShort;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  action: string;
  actor_id: string;
  details: Record<string, unknown>;
  created_at: string;
  actor?: TeamMemberShort;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  name: string;
  url: string;
  size: string | null;
  uploaded_by: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  View types                                                         */
/* ------------------------------------------------------------------ */

export type TaskView = "board" | "calendar" | "dashboard";
