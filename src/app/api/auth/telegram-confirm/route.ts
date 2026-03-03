import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneVariants } from "@/lib/sms/alphasms";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function normalizeTo380(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("380") && digits.length === 12) return digits;
  if (digits.startsWith("80") && digits.length === 11) return "3" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "38" + digits;
  if (digits.length === 9) return "380" + digits;
  return digits;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: authReq } = await supabase
      .from("auth_requests")
      .select("id, token, phone, profile_id, type, status, expires_at")
      .eq("token", token)
      .in("type", ["client", "client_register"])
      .eq("status", "confirmed")
      .maybeSingle();

    if (!authReq) {
      return NextResponse.json({ error: "Запит не знайдено або не підтверджено" }, { status: 401 });
    }

    if (new Date(authReq.expires_at) < new Date()) {
      return NextResponse.json({ error: "Час запиту вийшов" }, { status: 401 });
    }

    // ─── Registration flow ───
    if (authReq.type === "client_register") {
      const variants = phoneVariants(authReq.phone);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, phone")
        .in("phone", variants)
        .limit(1)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json(
          { error: "Профіль не створено. Спробуйте ще раз." },
          { status: 400 },
        );
      }

      const phone380 = normalizeTo380(profile.phone);
      const fakeEmail = `${phone380}@phone.shineshop.local`;

      // Ensure auth user exists — check by profile.id (same as auth user id)
      const { data: existingReg } = await supabase.auth.admin.getUserById(profile.id);

      if (!existingReg?.user) {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          id: profile.id,
          email: fakeEmail,
          phone: profile.phone,
          email_confirm: true,
          phone_confirm: true,
          password: crypto.randomUUID(),
          user_metadata: { phone: profile.phone },
        });
        if (createError && !createError.message.includes("already")) {
          console.error("[TelegramConfirm] Create user error:", createError);
          return NextResponse.json({ error: "Помилка створення акаунту" }, { status: 500 });
        }
        if (newUser?.user) {
          // Use newUser
        }
      }

      // Update profile email to match auth user
      await supabase.from("profiles").update({ email: fakeEmail }).eq("id", profile.id);

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: fakeEmail,
      });
      if (linkError || !linkData) {
        console.error("[ClientAuthConfirm] Generate link error:", linkError);
        return NextResponse.json({ error: "Помилка генерації посилання" }, { status: 500 });
      }

      await supabase.from("auth_requests").update({ status: "expired" }).eq("id", authReq.id);

      return NextResponse.json({
        success: true,
        token_hash: linkData.properties.hashed_token,
        email: fakeEmail,
        isNewUser: true,
      });
    }

    // ─── Existing login flow (type === 'client') ───
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, phone, first_name, last_name")
      .eq("id", authReq.profile_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Профіль не знайдено" }, { status: 404 });
    }

    const fakeEmail = `${normalizeTo380(profile.phone)}@phone.shineshop.local`;

    // Ensure auth user exists — check by profile.id (same as auth user id)
    const { data: existingById } = await supabase.auth.admin.getUserById(profile.id);

    if (!existingById?.user) {
      const { error: createError } = await supabase.auth.admin.createUser({
        email: fakeEmail,
        phone: profile.phone,
        email_confirm: true,
        phone_confirm: true,
        password: crypto.randomUUID(),
      });

      if (createError && !createError.message.includes("already")) {
        console.error("[ClientAuthConfirm] Create user error:", createError);
        return NextResponse.json({ error: "Помилка створення користувача" }, { status: 500 });
      }
    }

    // Ensure profile has email set
    await supabase.from("profiles").update({ email: fakeEmail }).eq("id", profile.id);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: fakeEmail,
    });

    if (linkError || !linkData) {
      console.error("[ClientAuthConfirm] Generate link error:", linkError);
      return NextResponse.json({ error: "Помилка генерації посилання" }, { status: 500 });
    }

    await supabase
      .from("auth_requests")
      .update({ status: "expired" })
      .eq("id", authReq.id);

    return NextResponse.json({
      success: true,
      token_hash: linkData.properties.hashed_token,
      email: fakeEmail,
    });
  } catch (err) {
    console.error("[ClientAuthConfirm] Error:", err);
    return NextResponse.json({ error: "Внутрішня помилка сервера" }, { status: 500 });
  }
}
