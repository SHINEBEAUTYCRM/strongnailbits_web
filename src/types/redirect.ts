export interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  code: 301 | 302;
  is_active: boolean;
  hits: number;
  last_hit_at: string | null;
  note: string | null;
  created_at: string;
}
