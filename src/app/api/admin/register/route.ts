import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/register
 * Creates a new admin user with auto-confirmed email.
 * The user still needs to be approved by an existing admin (admin_approved = false).
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, first_name, last_name } = await request.json();

    if (!email || !password || !first_name) {
      return NextResponse.json({ error: "email, password, first_name required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password min 6 characters" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Create user with admin client — email is auto-confirmed
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (authError) {
      if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
        return NextResponse.json({ error: "Цей email вже зареєстрований" }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // Update profile — set role to manager, NOT approved yet
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      first_name,
      last_name: last_name || null,
      role: "manager",
      admin_approved: false,
    }, { onConflict: "id" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
