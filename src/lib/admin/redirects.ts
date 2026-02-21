import { createAdminClient } from "@/lib/supabase/admin";

export async function getRedirects(params?: { search?: string; active?: boolean }) {
  const supabase = createAdminClient();
  let query = supabase
    .from("redirects")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.active !== undefined) query = query.eq("is_active", params.active);
  if (params?.search) {
    query = query.or(`from_path.ilike.%${params.search}%,to_path.ilike.%${params.search}%`);
  }

  const { data } = await query;
  return data ?? [];
}
