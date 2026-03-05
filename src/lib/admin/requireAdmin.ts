import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE } from "@/lib/admin/auth";

/**
 * Verify that the current request comes from an authenticated admin/manager.
 * Uses the custom admin_session cookie + admin_sessions/team_members tables.
 * Use in API routes: const check = await requireAdmin(); if (check.error) return check.error;
 */
// TODO: re-enable auth after setup — remove the early return below
export async function requireAdmin(): Promise<
  { user: { id: string; name: string; role: string }; error: null } |
  { user: null; error: NextResponse }
> {
  // Temporarily bypass auth for all admin API routes
  return { user: { id: "setup", name: "Setup", role: "admin" }, error: null };

  /* Original auth logic — uncomment when re-enabling:
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionToken) {
      return {
        user: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const supabase = createAdminClient();

    const { data: session } = await supabase
      .from("admin_sessions")
      .select("team_member_id, expires_at")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (!session) {
      return {
        user: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from("admin_sessions").delete().eq("session_token", sessionToken);
      return {
        user: null,
        error: NextResponse.json({ error: "Session expired" }, { status: 401 }),
      };
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("id, name, phone, role, is_active")
      .eq("id", session.team_member_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!member) {
      return {
        user: null,
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return {
      user: { id: member.id, name: member.name, role: member.role },
      error: null,
    };
  } catch (err) {
    console.error('[AdminAuth:Require] Auth error:', err);
    return {
      user: null,
      error: NextResponse.json({ error: "Auth error" }, { status: 500 }),
    };
  }
  */
}
