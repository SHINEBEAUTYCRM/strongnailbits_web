import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, phoneVariants } from "@/lib/sms/alphasms";
import { notifyNewCustomer } from "@/lib/telegram/notify";
import { trackFunnelEvent } from "@/lib/funnels/tracker";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/phone-auth
 * Completes registration (new user) or returns sign-in credentials (existing user).
 *
 * For new users: creates Supabase Auth user + profile with phone confirmed.
 * For existing users: generates a magic link or returns user info for password login.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phone: rawPhone,
      action,
      password,
      firstName,
      lastName,
      company,
    } = body;

    if (!rawPhone) {
      return NextResponse.json(
        { error: "Телефон обов'язковий" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(rawPhone);
    const supabase = createAdminClient();

    // ACTION: register — create new user with phone
    if (action === "register") {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: "Пароль повинен містити мінімум 6 символів" },
          { status: 400 },
        );
      }

      if (!firstName) {
        return NextResponse.json(
          { error: "Ім'я обов'язкове" },
          { status: 400 },
        );
      }

      // Check if profile with this phone already exists (all formats including 1C)
      const variants = phoneVariants(phone);
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .in("phone", variants)
        .limit(1)
        .single();

      if (existingProfile) {
        return NextResponse.json(
          { error: "Користувач з цим номером вже існує. Увійдіть" },
          { status: 409 },
        );
      }

      // Create user in Supabase Auth using phone + password
      // Use phone as email placeholder: 380XXXXXXXXX@phone.shineshop.local
      const fakeEmail = `${phone}@phone.shineshop.local`;

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: fakeEmail,
          password,
          phone,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName || "",
            phone,
          },
        });

      if (authError) {
        console.error("[Phone Auth] Create user error:", authError);
        if (authError.message.includes("already")) {
          return NextResponse.json(
            { error: "Користувач з цим номером вже зареєстрований" },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { error: "Помилка створення акаунту" },
          { status: 500 },
        );
      }

      // Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: fakeEmail,
        phone,
        first_name: firstName,
        last_name: lastName || "",
        company: company || "",
        role: "user",
      });

      if (profileError) {
        console.error("[Phone Auth] Profile create error:", profileError);
      }

      // Try to auto-link with 1C customer by phone
      const linked = await autoLinkWith1C(supabase, authData.user.id, phone);

      // Track funnel: registration
      trackFunnelEvent({
        event: "register",
        phone,
        profileId: authData.user.id,
        name: `${firstName} ${lastName || ""}`.trim(),
      });

      // Telegram notification (non-blocking)
      notifyNewCustomer({
        name: `${firstName} ${lastName || ""}`.trim(),
        phone: `+${phone}`,
        company: company || undefined,
        linkedTo1C: linked,
      });

      return NextResponse.json({
        success: true,
        userId: authData.user.id,
        // Client will use phone + password to signInWithPassword
        loginEmail: fakeEmail,
      });
    }

    // ACTION: get-login-email — get the fake email for existing user to login
    if (action === "get-login-email") {
      const variants = phoneVariants(phone);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email")
        .in("phone", variants)
        .limit(1)
        .single();

      if (!profile) {
        return NextResponse.json(
          { error: "Користувач не знайдений" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        loginEmail: profile.email,
      });
    }

    // ACTION: reset-password — update password for phone-verified user
    if (action === "reset-password") {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: "Пароль повинен містити мінімум 6 символів" },
          { status: 400 },
        );
      }

      const variants = phoneVariants(phone);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .in("phone", variants)
        .limit(1)
        .single();

      if (!profile) {
        return NextResponse.json(
          { error: "Користувач не знайдений" },
          { status: 404 },
        );
      }

      const { error: updateError } =
        await supabase.auth.admin.updateUserById(profile.id, {
          password,
        });

      if (updateError) {
        console.error("[Phone Auth] Password reset error:", updateError);
        return NextResponse.json(
          { error: "Помилка зміни паролю" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    // ACTION: otp-login — login existing user after OTP verification (no password)
    if (action === "otp-login") {
      const variants = phoneVariants(phone);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email")
        .in("phone", variants)
        .limit(1)
        .single();

      if (!profile) {
        return NextResponse.json(
          { error: "Користувач не знайдений" },
          { status: 404 },
        );
      }

      // Generate a temporary password and set it, then return credentials
      const tempPassword = crypto.randomUUID();

      const { error: updateError } =
        await supabase.auth.admin.updateUserById(profile.id, {
          password: tempPassword,
        });

      if (updateError) {
        console.error("[Phone Auth] OTP login update error:", updateError);
        return NextResponse.json(
          { error: "Помилка авторизації" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        loginEmail: profile.email,
        tempPassword,
      });
    }

    return NextResponse.json({ error: "Невідома дія" }, { status: 400 });
  } catch (err) {
    console.error("[Phone Auth] Error:", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 },
    );
  }
}

/**
 * Auto-link new user with existing 1C customer record by phone number.
 * Updates the profile with 1C external_id, loyalty, balance info if found.
 */
async function autoLinkWith1C(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  phone: string,
): Promise<boolean> {
  try {
    // Look for 1C customer profile that matches by phone (all formats)
    // 1C stores phones as "637443889" (9 digits), we store "380637443889"
    const variants = phoneVariants(phone);
    const { data: c1Profile } = await supabase
      .from("profiles")
      .select(
        "external_id, loyalty_points, loyalty_tier, balance, credit_limit, discount_percent, manager_name",
      )
      .in("phone", variants)
      .not("external_id", "is", null)
      .neq("id", userId)
      .limit(1)
      .single();

    if (c1Profile && c1Profile.external_id) {
      // Merge 1C data into the new user's profile
      await supabase
        .from("profiles")
        .update({
          external_id: c1Profile.external_id,
          loyalty_points: c1Profile.loyalty_points || 0,
          loyalty_tier: c1Profile.loyalty_tier || "",
          balance: c1Profile.balance || 0,
          credit_limit: c1Profile.credit_limit || 0,
          discount_percent: c1Profile.discount_percent || 0,
          manager_name: c1Profile.manager_name || "",
        })
        .eq("id", userId);

      console.log(
        `[1C Link] Linked user ${userId} with 1C customer ${c1Profile.external_id}`,
      );
      return true;
    }
    return false;
  } catch (err) {
    // Non-critical — log and continue
    console.error("[1C Link] Auto-link error:", err);
    return false;
  }
}
