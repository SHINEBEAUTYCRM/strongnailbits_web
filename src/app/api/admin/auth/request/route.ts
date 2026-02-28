import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneLast9 } from "@/lib/admin/phone";
import { sendTelegramMessage } from "@/lib/admin/telegram";
import { generateToken } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// Rate limit: track requests per IP (in-memory, resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Rate limiting: max 3 requests per IP per 5 minutes
    const now = Date.now();
    const rl = rateLimitMap.get(ip);
    if (rl && rl.resetAt > now && rl.count >= 3) {
      return NextResponse.json(
        { error: "Занадто багато спроб. Спробуйте через 5 хвилин." },
        { status: 429 },
      );
    }
    if (!rl || rl.resetAt <= now) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    } else {
      rl.count++;
    }

    const body = await request.json();
    const rawPhone = body.phone;

    if (!rawPhone || typeof rawPhone !== "string") {
      return NextResponse.json(
        { error: "Введіть номер телефону" },
        { status: 400 },
      );
    }

    // 1. Find team member by last 9 digits
    const last9 = phoneLast9(rawPhone);
    console.info("[AuthRequest] Phone last9:", last9);

    if (last9.length !== 9) {
      return NextResponse.json(
        { error: "Невірний формат номера" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: members, error: dbError } = await supabase
      .from("team_members")
      .select("id, name, phone, telegram_chat_id, is_active")
      .eq("is_active", true);

    if (dbError) {
      console.error("[AuthRequest] DB error:", dbError);
      return NextResponse.json(
        { error: "Помилка бази даних" },
        { status: 500 },
      );
    }

    const member = members?.find((m) => phoneLast9(m.phone) === last9) || null;

    if (!member) {
      console.info("[AuthRequest] No member found for last9:", last9);
      console.info(
        "[AuthRequest] Available phones:",
        members?.map((m) => m.phone),
      );
      return NextResponse.json(
        { error: "Номер не знайдено в системі" },
        { status: 404 },
      );
    }

    // 2. Check that Telegram is linked
    if (!member.telegram_chat_id) {
      return NextResponse.json(
        {
          error: "no_telegram",
          message:
            `Спочатку прив'яжіть Telegram: відкрийте @${process.env.NEXT_PUBLIC_TELEGRAM_ADMIN_BOT_USERNAME || "ShineShopAdminBot"} і надішліть /start`,
        },
        { status: 400 },
      );
    }

    // 3. Create auth token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const { error: insertError } = await supabase
      .from("auth_requests")
      .insert({
        token,
        phone: member.phone,
        team_member_id: member.id,
        status: "pending",
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[AuthRequest] Insert error:", insertError);
      return NextResponse.json(
        { error: "Помилка створення запиту" },
        { status: 500 },
      );
    }

    // 4. Send Telegram message
    const browser = parseUserAgent(userAgent);
    const timeStr = new Date().toLocaleString("uk-UA", {
      timeZone: "Europe/Kyiv",
    });

    const result = await sendTelegramMessage(
      member.telegram_chat_id,
      `🔐 <b>Запит на вхід в адмінку</b>\n\n` +
        `👤 ${member.name}\n` +
        `📱 ${member.phone}\n` +
        `💻 ${browser}\n` +
        `📍 IP: ${ip}\n` +
        `🕐 ${timeStr}\n\n` +
        `Це ви?`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Підтвердити вхід",
                callback_data: `auth_confirm:${token}`,
              },
              { text: "❌ Це не я", callback_data: `auth_deny:${token}` },
            ],
          ],
        },
      },
    );

    if (!result.ok) {
      console.error("[AuthRequest] Telegram send failed:", result.error);

      // Clean up — delete auth_request since message didn't go through
      await supabase.from("auth_requests").delete().eq("token", token);

      return NextResponse.json(
        {
          error: `Не вдалося надіслати в Telegram: ${result.error}`,
        },
        { status: 500 },
      );
    }

    // 5. Success
    return NextResponse.json({
      ok: true,
      token,
      expires_at: expiresAt.toISOString(),
      member_name: member.name,
    });
  } catch (err) {
    console.error("[AuthRequest] Error:", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 },
    );
  }
}

function parseUserAgent(ua: string): string {
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Browser";
}
