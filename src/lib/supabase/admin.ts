import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client — обходить RLS (Row Level Security).
 * Singleton pattern — reuses the same client instance across all calls
 * within a single server runtime (avoids reconnection overhead).
 */
let _adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const stub = { data: null, error: null, count: null };
    const makeChain = (): unknown =>
      new Proxy(() => {}, {
        get(_, prop) {
          if (prop === "then")
            return (resolve: (v: unknown) => void) => resolve(stub);
          if (typeof prop === "symbol") return undefined;
          return makeChain();
        },
        apply() {
          return makeChain();
        },
      });
    return new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (typeof prop === "symbol") return undefined;
        return makeChain();
      },
    });
  }

  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
