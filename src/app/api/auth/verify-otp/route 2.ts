import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, phoneVariants } from "@/lib/sms/alphasms";
import { trackFunnelEvent } from "@/lib/funnels/tracker";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone: rawPhone, code } = body;

    if (!rawPhone || !code) {
      return NextResponse.json(
        { error: "Телефон і код обов'язкові" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(rawPhone);
    const supabase = createAdminClient();

    // Find valid OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from("phone_otp")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      // Increment attempts counter for rate limiting
      const { data: latestOtp } = await supabase
        .from("phone_otp")
        .select("id, attempts")
        .eq("phone", phone)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestOtp) {
        const newAttempts = (latestOtp.attempts || 0) + 1;
        await supabase
          .from("phone_otp")
          .update({ attempts: newAttempts })
          .eq("id", latestOtp.id);

        // Block after 5 wrong attempts
        if (newAttempts >= 5) {
          await supabase
            .from("phone_otp")
            .update({ used: true })
            .eq("id", latestOtp.id);

          return NextResponse.json(
            { error: "Забагато невірних спроб. Запросіть новий код" },
            { status: 429 },
          );
        }
      }

      return NextResponse.json(
        { error: "Невірний або прострочений код" },
        { status: 400 },
      );
    }

    // Check max attempts
    if ((otpRecord.attempts || 0) >= 5) {
      await supabase
        .from("phone_otp")
        .update({ used: true })
        .eq("id", otpRecord.id);

      return NextResponse.json(
        { error: "Забагато невірних спроб. Запросіть новий код" },
        { status: 429 },
      );
    }

    // Mark OTP as used
    await supabase
      .from("phone_otp")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // Check if user already exists by phone (try all formats including 1C short format)
    const variants = phoneVariants(phone);
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, phone, email, first_name, last_name")
      .in("phone", variants)
      .limit(1)
      .single();

    // Track funnel: OTP verified
    trackFunnelEvent({
      event: "otp_verified",
      phone,
      profileId: existingProfile?.id || undefined,
      name: existingProfile?.first_name || undefined,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      existingUser: !!existingProfile,
      profile: existingProfile
        ? {
            id: existingProfile.id,
            firstName: existingProfile.first_name,
            phone,
          }
        : null,
    });
  } catch (err) {
    console.error("[Verify OTP] Error:", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 },
    );
  }
}
