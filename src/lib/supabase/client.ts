"use client";

import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;
let _adminClient: ReturnType<typeof createBrowserClient> | null = null;

/** Singleton browser Supabase client — reuses across all components.
 *  Full auth support (auto-refresh, session persistence) for B2C storefront.
 */
export function createClient() {
  if (_client) return _client;

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return _client;
}

/** Admin-specific browser client — NO Supabase Auth management.
 *  Admin panel uses custom auth (admin_session cookie), NOT Supabase Auth.
 *  This client disables auto-refresh, session persistence, and URL detection
 *  to prevent onAuthStateChange events from interfering with the admin UI.
 *  Use this for Realtime subscriptions and data queries in admin components.
 */
export function createAdminBrowserClient() {
  if (_adminClient) return _adminClient;

  _adminClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  return _adminClient;
}
