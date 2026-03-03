// ================================================================
//  API: /api/integrations/[slug]/verify
//  POST — верифікувати і зберегти ключі інтеграції
//  Кастомна перевірка для сервісів з API (Serpstat, AlphaSMS, тощо)
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { SimpleKeyIntegration } from "@/lib/integrations/base";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { slug } = await params;
  const { config } = await request.json();

  if (!config || typeof config !== "object") {
    return NextResponse.json({ success: false, message: "Missing config" }, { status: 400 });
  }

  const requiredKeys = Object.keys(config).filter((k) => config[k]);

  // —— Serpstat: перевірка токена через API v4 ——
  if (slug === "serpstat") {
    const apiKey = config.api_key || config.apiKey || config.token || "";

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "API ключ Serpstat не вказано. Введіть ключ і спробуйте знову.",
      });
    }

    try {
      console.log("[Serpstat verify] api_key length:", apiKey.length);

      const serpRes = await fetch(`https://api.serpstat.com/v4?token=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "1",
          method: "SerpstatDomainProcedure.getDomainsInfo",
          params: {
            domains: ["google.com"],
            se: "g_ua",
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      const serpData = await serpRes.json();
      console.log("[Serpstat verify] response:", JSON.stringify(serpData).substring(0, 200));

      if (serpData.error) {
        const integration = new SimpleKeyIntegration(slug, requiredKeys);
        await integration.verifyAndSave(config);
        return NextResponse.json({
          success: false,
          message: `Serpstat: ${serpData.error.message || "невірний API ключ"}`,
        });
      }

      // Зберегти верифіковану конфігурацію
      const integration = new SimpleKeyIntegration(slug, requiredKeys);
      await integration.verifyAndSave(config);

      const leftLines = serpData.result?.summary_info?.left_lines;
      return NextResponse.json({
        success: true,
        message: `Serpstat підключено!${leftLines ? ` Залишок кредитів: ${leftLines.toLocaleString()}` : ""}`,
        details: { left_lines: leftLines },
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        message: `Serpstat: помилка з'єднання — ${err instanceof Error ? err.message : "timeout"}`,
      });
    }
  }

  // —— Telegram: перевірка токена через getMe ——
  if (slug === "telegram-bot" || slug === "telegram-admin") {
    const botToken = config.bot_token || "";

    if (!botToken) {
      return NextResponse.json({
        success: false,
        message: "Bot Token не вказано. Створіть бота через @BotFather і вставте токен.",
      });
    }

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        signal: AbortSignal.timeout(10000),
      });
      const tgData = await tgRes.json();

      if (!tgData.ok) {
        return NextResponse.json({
          success: false,
          message: `Telegram: невірний токен — ${tgData.description || "перевірте і спробуйте знову"}`,
        });
      }

      // Автозаповнення bot_username якщо не вказано
      if (!config.bot_username && tgData.result?.username) {
        config.bot_username = tgData.result.username;
      }

      // Зберегти верифіковану конфігурацію
      const integration = new SimpleKeyIntegration(slug, requiredKeys.length > 0 ? requiredKeys : Object.keys(config).filter(k => config[k]));
      await integration.verifyAndSave(config);

      const botName = tgData.result?.first_name || tgData.result?.username || "Bot";
      let webhookMsg = "";

      // Auto-set webhook for telegram-admin
      if (slug === "telegram-admin") {
        const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com"}/api/admin/auth/telegram-webhook`;
        const whSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
        try {
          const whBody: Record<string, unknown> = {
            url: webhookUrl,
            allowed_updates: ["message", "callback_query"],
          };
          if (whSecret) whBody.secret_token = whSecret;

          const whRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(whBody),
            signal: AbortSignal.timeout(10000),
          });
          const whData = await whRes.json();
          webhookMsg = whData.ok ? " Webhook встановлено." : ` Webhook: ${whData.description}`;
        } catch {
          webhookMsg = " (Webhook не вдалось встановити)";
        }
      }

      return NextResponse.json({
        success: true,
        message: `${botName} (@${tgData.result?.username}) підключено!${webhookMsg}`,
        details: { bot_id: tgData.result?.id, username: tgData.result?.username },
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        message: `Telegram: помилка з'єднання — ${err instanceof Error ? err.message : "timeout"}`,
      });
    }
  }

  // —— Базова верифікація для інших сервісів ——
  try {
    const integration = new SimpleKeyIntegration(slug, requiredKeys);
    const result = await integration.verifyAndSave(config);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: err instanceof Error ? err.message : "Помилка верифікації",
    });
  }
}
