import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client — обходить RLS (Row Level Security).
 * НІКОЛИ не використовувати в клієнтському коді або браузері.
 * Тільки для серверних операцій: sync engine, міграції, адмін-задачі.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
