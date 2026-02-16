import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, sendOtpSms } from "@/lib/sms/alphasms";
import { rateLimit, tooManyRequests } from '@/lib/api/rate-limit';
import { notifySmsError } from "@/lib/telegram/notify";
import { trackFunnelEvent } from "@/lib/funnels/tracker";

export const dynamic = "force-dynamic";

/** Generate 4-digit OTP code */
function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Rate limit: max 3 OTP per phone per 10 minutes */
async function checkRateLimit(
  supabase: ReturnType<typeof createAdminClient>,
  phone: string,
): Promise<boolean> {
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("phone_otp")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", tenMinAgo);

  return (count ?? 0) < 3;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone: rawPhone } = body;

    if (!rawPhone) {
      return NextResponse.json(
        { error: "Номер телефону обов'язковий" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(rawPhone);

    const { allowed } = rateLimit(`otp:${phone}`, 3, 600);
    if (!allowed) return tooManyRequests(600);

    // Validate Ukrainian phone (must be 12 digits starting with 380)
    if (!phone.match(/^380\d{9}$/)) {
      console.error("[OTP] Invalid phone format, length:", rawPhone?.length || 0);
      return NextResponse.json(
        {
          error: `Невірний формат номеру. Введіть номер у форматі +380XXXXXXXXX або 0XXXXXXXXX`,
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Generate OTP
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Mark all previous unused OTPs as used
    await supabase
      .from("phone_otp")
      .update({ used: true })
      .eq("phone", phone)
      .eq("used", false);

    // Store OTP
    const { error: insertError } = await supabase.from("phone_otp").insert({
      phone,
      code,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("[OTP] Insert error:", insertError);
      return NextResponse.json(
        { error: "Помилка збереження коду" },
        { status: 500 },
      );
    }

    // Send SMS via AlphaSMS
    const smsResult = await sendOtpSms(phone, code);

    if (!smsResult.success) {
      console.error("[OTP] SMS send failed:", smsResult.error);
      // Notify admin about SMS failure
      notifySmsError({
        phone: `+${phone}`,
        error: smsResult.error || "Unknown error",
        provider: "AlphaSMS",
      });
      return NextResponse.json(
        { error: "Помилка відправки SMS. Спробуйте пізніше" },
        { status: 500 },
      );
    }

    // Track funnel: OTP sent
    trackFunnelEvent({ event: "otp_sent", phone });

    return NextResponse.json({
      success: true,
      message: "Код відправлено",
    });
  } catch (err) {
    console.error("[OTP] Error:", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 },
    );
  }
}
