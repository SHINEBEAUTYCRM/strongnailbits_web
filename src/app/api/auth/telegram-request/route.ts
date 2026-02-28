import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TelegramBot } from "@/lib/telegram/bot";
import { getServiceField } from "@/lib/integrations/config-resolver";
import { normalizePhone, phoneVariants } from "@/lib/sms/alphasms";
import { generateToken } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

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
      return NextResponse.json({ error: "Введіть номер телефону" }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);
    const variants = phoneVariants(phone);
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, phone, telegram_chat_id, first_name")
      .in("phone", variants)
      .limit(1)
      .maybeSingle();

    if (!profile) {
      // Registration flow — no profile found, create reg request
      const regToken = generateToken();
      const regExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabase.from("auth_requests").insert({
        token: regToken,
        phone,
        type: "client_register",
        status: "pending",
        ip_address: ip,
        user_agent: userAgent,
        expires_at: regExpiresAt.toISOString(),
      });

      const botUsername =
        (await getServiceField("telegram-bot", "bot_username")) ||
        process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
        "shineshop_b2b_bot";
      const botUrl = `https://t.me/${botUsername}?start=reg_${regToken}`;

      return NextResponse.json({
        ok: true,
        token: regToken,
        status: "register",
        botUrl,
        expires_at: regExpiresAt.toISOString(),
      });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const { error: insertError } = await supabase.from("auth_requests").insert({
      token,
      phone: profile.phone,
      profile_id: profile.id,
      type: "client",
      status: "pending",
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("[ClientAuth] Insert error:", insertError);
      return NextResponse.json({ error: "Помилка створення запиту" }, { status: 500 });
    }

    // A) telegram_chat_id exists → send confirmation message directly
    if (profile.telegram_chat_id) {
      const botToken = await getServiceField("telegram-bot", "bot_token");
      if (!botToken) {
        await supabase.from("auth_requests").delete().eq("token", token);
        return NextResponse.json({ error: "Telegram бот не налаштовано" }, { status: 500 });
      }

      const bot = new TelegramBot(botToken);
      const masked = phone.slice(0, 4) + "*****" + phone.slice(-4);
      const timeStr = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });

      const result = await bot.sendMessage(
        profile.telegram_chat_id,
        `🔐 <b>Запит на вхід</b>\n\nВхід на сайт/додаток ShineShop\n📱 ${masked}\n🕐 ${timeStr}\n\nЦе ви?`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Підтвердити вхід", callback_data: `client_auth_confirm:${token}` },
                { text: "❌ Це не я", callback_data: `client_auth_deny:${token}` },
              ],
            ],
          },
        },
      );

      if (!result.ok) {
        console.error("[ClientAuth] Telegram send failed:", result.description);
        await supabase.from("auth_requests").delete().eq("token", token);
        return NextResponse.json({ error: "Не вдалося надіслати в Telegram" }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        token,
        status: "sent",
        expires_at: expiresAt.toISOString(),
      });
    }

    // B) no telegram_chat_id → return deep link to bot
    const botUsername =
      (await getServiceField("telegram-bot", "bot_username")) ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      "shineshop_b2b_bot";
    const botUrl = `https://t.me/${botUsername}?start=auth_${token}`;

    return NextResponse.json({
      ok: true,
      token,
      status: "need_link",
      botUrl,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[ClientAuth] Error:", err);
    return NextResponse.json({ error: "Внутрішня помилка сервера" }, { status: 500 });
  }
}
