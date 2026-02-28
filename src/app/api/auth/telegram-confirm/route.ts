import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
      .select("id, token, phone, profile_id, status, expires_at")
      .eq("token", token)
      .eq("type", "client")
      .eq("status", "confirmed")
      .maybeSingle();

    if (!authReq) {
      return NextResponse.json({ error: "Запит не знайдено або не підтверджено" }, { status: 401 });
    }

    if (new Date(authReq.expires_at) < new Date()) {
      return NextResponse.json({ error: "Час запиту вийшов" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, phone, first_name, last_name")
      .eq("id", authReq.profile_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Профіль не знайдено" }, { status: 404 });
    }

    const fakeEmail = `${profile.phone}@phone.shineshop.local`;

    // Find existing auth user
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = users.find(
      (u) => u.email === fakeEmail || u.phone === profile.phone,
    );

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

    // Mark auth_request as used (one-time)
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
