import type { RoleKey, DepartmentKey } from "@/lib/admin/team-config";

/* ------------------------------------------------------------------ */
/*  Team Member (full)                                                 */
/* ------------------------------------------------------------------ */

export interface TeamMemberFull {
  id: string;
  name: string;
  phone: string;
  role: RoleKey;
  telegram_chat_id: number | null;
  avatar_url: string | null;
  is_active: boolean;
  email: string | null;
  telegram_username: string | null;
  position_title: string | null;
  department: DepartmentKey | null;
  hire_date: string | null;
  salary: number | null;         // тільки CEO
  schedule: string | null;
  work_hours: string | null;
  birthday: string | null;
  notes: string | null;          // тільки CEO
  personal_bio: string | null;
  skills: string[];
  color: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Team Member card (list view)                                       */
/* ------------------------------------------------------------------ */

export interface TeamMemberCard {
  id: string;
  name: string;
  phone: string;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  telegram_username: string | null;
  department: string | null;
  position_title: string | null;
  color: string;
  tasks_count: number;
  overdue_count: number;
}

/* ------------------------------------------------------------------ */
/*  KPI                                                                */
/* ------------------------------------------------------------------ */

export interface TeamKPI {
  id: string;
  member_id: string;
  period: string;
  metric: string;
  target: number | null;
  actual: number | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Self-editable fields                                               */
/* ------------------------------------------------------------------ */

export const SELF_EDITABLE_FIELDS = [
  "avatar_url",
  "personal_bio",
  "birthday",
  "telegram_username",
  "email",
  "skills",
] as const;

export type SelfEditableField = (typeof SELF_EDITABLE_FIELDS)[number];
