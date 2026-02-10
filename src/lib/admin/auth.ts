import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

/**
 * Get the current admin user from the session.
 * Returns null if not authenticated or not an admin/manager.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, role, admin_approved")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role || "")) return null;
    if (!profile.admin_approved) return null;

    return {
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role,
    };
  } catch {
    return null;
  }
}
