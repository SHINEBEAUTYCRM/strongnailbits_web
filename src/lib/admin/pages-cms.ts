import { createAdminClient } from "@/lib/supabase/admin";

export async function getPages(params?: { status?: string; search?: string }) {
  const supabase = createAdminClient();
  let query = supabase
    .from("pages")
    .select("id, title_uk, title_ru, slug, status, template, position, published_at, updated_at")
    .order("position", { ascending: true });

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params?.search) {
    query = query.or(`title_uk.ilike.%${params.search}%,slug.ilike.%${params.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPage(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("pages").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPageBySlug(slug: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
}
