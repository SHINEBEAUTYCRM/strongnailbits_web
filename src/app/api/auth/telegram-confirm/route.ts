import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneVariants } from "@/lib/sms/alphasms";
import crypto from "crypto";

export const dynamic = "force-dynamic";

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

      const fakeEmail = `${profile.phone.replace(/\D/g, "")}@phone.shineshop.local`;

      // Check if auth user already exists (by email or phone)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let authUser: any = null;
      try {
        const { data: byEmail } = await supabase.auth.admin.getUserByEmail(fakeEmail);
        authUser = byEmail?.user || null;
      } catch { /* not found */ }

      if (!authUser) {
        try {
          const { data: byPhone } = await supabase.auth.admin.getUserByPhone(profile.phone);
          authUser = byPhone?.user || null;
        } catch { /* not found */ }
      }

      if (!authUser) {
        // Create auth user with SAME ID as profile — links them automatically
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          id: profile.id,
          email: fakeEmail,
          phone: profile.phone,
          email_confirm: true,
          phone_confirm: true,
          password: crypto.randomUUID(),
          user_metadata: { phone: profile.phone },
        });
        if (createError) {
          console.error("[TelegramConfirm] Create user error:", createError);
          return NextResponse.json({ error: "Помилка створення акаунту" }, { status: 500 });
        }
        authUser = newUser.user;
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

    const fakeEmail = `${profile.phone}@phone.shineshop.local`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let existingUser: any = null;
    try {
      const { data: byEmail } = await supabase.auth.admin.getUserByEmail(fakeEmail);
      existingUser = byEmail?.user || null;
    } catch { /* not found */ }

    if (!existingUser) {
      try {
        const { data: byPhone } = await supabase.auth.admin.getUserByPhone(profile.phone);
        existingUser = byPhone?.user || null;
      } catch { /* not found */ }
    }

    if (!existingUser) {
      const { error: createError } = await supabase.auth.admin.createUser({
        email: fakeEmail,
        phone: profile.phone,
        email_confirm: true,
        phone_confirm: true,
        password: crypto.randomUUID(),
      });

      if (createError) {
        console.error("[ClientAuthConfirm] Create user error:", createError);
        return NextResponse.json({ error: "Помилка створення користувача" }, { status: 500 });
      }
    }

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
