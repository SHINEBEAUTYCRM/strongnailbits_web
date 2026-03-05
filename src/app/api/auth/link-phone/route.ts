import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, phoneVariants } from "@/lib/sms/alphasms";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/link-phone
 *
 * Links a phone number to the current Apple-authenticated user.
 * If a phone-based account already exists → merges Apple identity into existing account.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone: rawPhone } = body;

    if (!rawPhone) {
      return NextResponse.json(
        { error: "Телефон обов'язковий" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(rawPhone);

    // Get current Apple-authenticated user
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
            } catch {}
          },
        },
      },
    );

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Не авторизовано" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    // Check if a profile with this phone already exists
    const variants = phoneVariants(phone);
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, email, phone, first_name, last_name, company, type, discount_percent, price_group, nova_poshta_city, nova_poshta_warehouse, delivery_address, total_orders, total_spent, external_id, loyalty_points, loyalty_tier, balance, credit_limit, manager_name")
      .in("phone", variants)
      .neq("id", currentUser.id)
      .limit(1)
      .single();

    if (existingProfile) {
      // ═══ MERGE: phone-based account exists → transfer Apple user to it ═══

      // 1. Delete the Apple-only profile (if it was auto-created)
      await admin.from("profiles").delete().eq("id", currentUser.id);

      // 2. Delete the Apple-only auth user
      await admin.auth.admin.deleteUser(currentUser.id);

      // 3. Link Apple identity to existing user by generating temp credentials
      const tempPassword = crypto.randomUUID();
      await admin.auth.admin.updateUserById(existingProfile.id, {
        password: tempPassword,
      });

      return NextResponse.json({
        success: true,
        merged: true,
        loginEmail: existingProfile.email,
        tempPassword,
        message: "Акаунти об'єднано",
      });
    }

    // ═══ NO EXISTING: just update the Apple user's profile with phone ═══
    const appleEmail = currentUser.email || "";
    const appleName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      "";
    const [firstName, ...lastParts] = appleName.split(" ");

    // Check if profile exists for this user
    const { data: ownProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", currentUser.id)
      .single();

    if (ownProfile) {
      // Update existing profile
      await admin
        .from("profiles")
        .update({
          phone,
          ...(appleEmail && !appleEmail.includes("@phone.strongnailbits.local")
            ? { email: appleEmail }
            : {}),
        })
        .eq("id", currentUser.id);
    } else {
      // Create new profile
      const fakeEmail = `${phone}@phone.strongnailbits.local`;
      await admin.from("profiles").insert({
        id: currentUser.id,
        email: appleEmail || fakeEmail,
        phone,
        first_name: firstName || "",
        last_name: lastParts.join(" ") || "",
      });
    }

    // Update auth user metadata with phone
    await admin.auth.admin.updateUserById(currentUser.id, {
      phone,
      phone_confirm: true,
      user_metadata: {
        ...currentUser.user_metadata,
        phone,
      },
    });

    return NextResponse.json({
      success: true,
      merged: false,
      message: "Телефон привʼязано",
    });
  } catch (err) {
    console.error("[Link Phone] Error:", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 },
    );
  }
}
