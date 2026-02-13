import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, generateToken } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// Rate limit: track requests per IP (in-memory, resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Rate limiting: max 3 requests per IP per 5 minutes
    const now = Date.now();
    const rl = rateLimitMap.get(ip);
    if (rl && rl.resetAt > now && rl.count >= 3) {
      return NextResponse.json(
        { error: "Занадто багато спроб. Спробуйте через 5 хвилин." },
        { status: 429 }
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
      return NextResponse.json({ error: "Номер телефону обов'язковий" }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);

    // Validate Ukrainian phone format
    if (!/^\+380\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "Невірний формат номера. Має бути +380XXXXXXXXX" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check team_members
    const { data: member } = await supabase
      .from("team_members")
      .select("id, name, phone, telegram_chat_id, is_active")
      .eq("phone", phone)
      .eq("is_active", true)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: "Доступ заборонено. Зверніться до адміністратора." },
        { status: 403 }
      );
    }

    if (!member.telegram_chat_id) {
      return NextResponse.json(
        { error: "no_telegram", message: "Спочатку напишіть /start боту @ShineShopAdminBot" },
        { status: 400 }
      );
    }

    // Generate auth request
    const token = generateToken();

    const { error: insertError } = await supabase.from("auth_requests").insert({
      token,
      phone,
      team_member_id: member.id,
      ip_address: ip,
      user_agent: userAgent,
    });

    if (insertError) {
      console.error("[AuthRequest] Insert error:", insertError);
      return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
    }

    // Parse user agent for display
    const uaShort = parseUserAgent(userAgent);
    const timeStr = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });

    // Send Telegram message via Admin Bot
    const botToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
    if (!botToken) {
      console.error("[AuthRequest] TELEGRAM_ADMIN_BOT_TOKEN not set");
      return NextResponse.json({ error: "Помилка конфігурації" }, { status: 500 });
    }

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: member.telegram_chat_id,
        text:
          `🔐 Запит на вхід в адмінку\n\n` +
          `👤 ${member.name}\n` +
          `📱 ${phone}\n` +
          `🌐 ${uaShort}\n` +
          `📍 IP: ${ip}\n` +
          `🕐 ${timeStr}\n\n` +
          `Це ви?`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Підтвердити вхід", callback_data: `auth_confirm:${token}` },
              { text: "❌ Це не я", callback_data: `auth_deny:${token}` },
            ],
          ],
        },
      }),
    });

    if (!tgResponse.ok) {
      const tgError = await tgResponse.text();
      console.error("[AuthRequest] Telegram error:", tgError);
      return NextResponse.json({ error: "Не вдалося надіслати повідомлення в Telegram" }, { status: 500 });
    }

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[AuthRequest] Error:", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
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
