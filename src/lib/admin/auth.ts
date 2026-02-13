import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Re-export phone utils for backward compatibility
export { normalizePhone, phoneLast9, phoneLast9 as getPhoneDigits } from "./phone";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  telegram_chat_id: number | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface AuthRequest {
  id: string;
  token: string;
  phone: string;
  team_member_id: string;
  status: "pending" | "confirmed" | "expired";
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  confirmed_at: string | null;
  expires_at: string;
}

export interface AdminSession {
  id: string;
  team_member_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
}

/** Compatible interface for AdminShell */
export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  avatar_url: string | null;
}

/* ------------------------------------------------------------------ */
/*  Cookie name                                                        */
/* ------------------------------------------------------------------ */

export const SESSION_COOKIE = "admin_session";

/* ------------------------------------------------------------------ */
/*  Token generation (32 hex chars — fits Telegram callback_data)      */
/* ------------------------------------------------------------------ */

export function generateToken(): string {
  // Use Web Crypto API (Edge-safe, no Node.js crypto import)
  return crypto.randomUUID().replace(/-/g, "");
}

/* ------------------------------------------------------------------ */
/*  Get current team member from session cookie                        */
/* ------------------------------------------------------------------ */

export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionToken) return null;

    const supabase = createAdminClient();

    const { data: session } = await supabase
      .from("admin_sessions")
      .select("team_member_id, expires_at")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (!session) return null;

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      // Clean up expired session
      await supabase.from("admin_sessions").delete().eq("session_token", sessionToken);
      return null;
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("id, name, phone, role, avatar_url, is_active")
      .eq("id", session.team_member_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!member) return null;

    return {
      id: member.id,
      name: member.name,
      phone: member.phone,
      role: member.role,
      avatar_url: member.avatar_url,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Validate session token (for middleware — no cookies() usage)        */
/* ------------------------------------------------------------------ */

export async function validateSession(sessionToken: string): Promise<AdminUser | null> {
  try {
    const supabase = createAdminClient();

    const { data: session } = await supabase
      .from("admin_sessions")
      .select("team_member_id, expires_at")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (!session) return null;

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from("admin_sessions").delete().eq("session_token", sessionToken);
      return null;
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("id, name, phone, role, avatar_url, is_active")
      .eq("id", session.team_member_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!member) return null;

    return {
      id: member.id,
      name: member.name,
      phone: member.phone,
      role: member.role,
      avatar_url: member.avatar_url,
    };
  } catch {
    return null;
  }
}
