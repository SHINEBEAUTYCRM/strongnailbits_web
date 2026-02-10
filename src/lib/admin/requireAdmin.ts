import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Verify that the current request comes from an authenticated admin/manager.
 * Use in API routes: const check = await requireAdmin(); if (check.error) return check.error;
 */
export async function requireAdmin(): Promise<
  { user: { id: string; email: string; role: string }; error: null } |
  { user: null; error: NextResponse }
> {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // ignore in read-only context
            }
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        user: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, admin_approved")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role || "") || !profile.admin_approved) {
      return {
        user: null,
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return {
      user: { id: user.id, email: user.email || "", role: profile.role },
      error: null,
    };
  } catch {
    return {
      user: null,
      error: NextResponse.json({ error: "Auth error" }, { status: 500 }),
    };
  }
}
