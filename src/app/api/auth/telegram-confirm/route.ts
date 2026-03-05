import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneVariants } from "@/lib/sms/alphasms";

export const dynamic = "force-dynamic";

function normalizeTo380(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("380") && digits.length === 12) return digits;
  if (digits.startsWith("80") && digits.length === 11) return "3" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "38" + digits;
  if (digits.length === 9) return "380" + digits;
  return digits;
}

/**
 * Migrate profile to a new id when generateLink created an auth user
 * with a different UUID than profile.id.
 */
async function migrateProfileId(
  supabase: ReturnType<typeof createAdminClient>,
  oldId: string,
  newId: string,
  email: string,
): Promise<void> {
  const { data: oldProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", oldId)
    .single();

  if (!oldProfile) {
    console.warn("[migrateProfileId] Old profile not found:", oldId);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _oldId, ...profileData } = oldProfile;
  const { error: upsertError } = await supabase.from("profiles").upsert({
    id: newId,
    ...profileData,
    email,
  });

  if (upsertError) {
    console.error("[migrateProfileId] Upsert new profile failed:", upsertError.message);
    return;
  }

  const { error: deleteError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", oldId);

  if (deleteError) {
    console.warn("[migrateProfileId] Delete old profile failed (FK refs?):", deleteError.message);
  }

  await supabase
    .from("auth_requests")
    .update({ profile_id: newId })
    .eq("profile_id", oldId);

  console.log("[migrateProfileId] Migrated profile", oldId, "→", newId);
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
      const fakeEmail = `${phone380}@phone.strongnailbits.local`;
      console.log("[TelegramConfirm:register] profile:", profile.id, "email:", fakeEmail);

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: fakeEmail,
      });

      if (linkError || !linkData) {
        console.error("[TelegramConfirm:register] generateLink error:", linkError);
        return NextResponse.json({ error: "Помилка генерації посилання" }, { status: 500 });
      }

      const authUserId = linkData.user?.id;
      console.log("[TelegramConfirm:register] auth user id:", authUserId);

      if (authUserId && authUserId !== profile.id) {
        console.warn("[TelegramConfirm:register] ID mismatch! auth:", authUserId, "profile:", profile.id);
        await migrateProfileId(supabase, profile.id, authUserId, fakeEmail);
      } else {
        await supabase.from("profiles").update({ email: fakeEmail }).eq("id", profile.id);
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

    const fakeEmail = `${normalizeTo380(profile.phone)}@phone.strongnailbits.local`;
    console.log("[TelegramConfirm:login] profile:", profile.id, "email:", fakeEmail);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: fakeEmail,
    });

    if (linkError || !linkData) {
      console.error("[TelegramConfirm:login] generateLink error:", linkError);
      return NextResponse.json({ error: "Помилка генерації посилання" }, { status: 500 });
    }

    const authUserId = linkData.user?.id;
    console.log("[TelegramConfirm:login] auth user id:", authUserId);

    if (authUserId && authUserId !== profile.id) {
      console.warn("[TelegramConfirm:login] ID mismatch! auth:", authUserId, "profile:", profile.id);
      await migrateProfileId(supabase, profile.id, authUserId, fakeEmail);
    } else {
      await supabase.from("profiles").update({ email: fakeEmail }).eq("id", profile.id);
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
    console.error("[TelegramConfirm] Error:", err);
    return NextResponse.json({ error: "Внутрішня помилка сервера" }, { status: 500 });
  }
}
