/**
 * Telegram Bot Setup Route
 *
 * One-time setup:
 * - Register webhook URL with Telegram
 * - Set bot commands (hamburger menu)
 * - Set bot description
 *
 * Usage:
 *   GET /api/telegram/setup?secret=YOUR_SECRET
 *   GET /api/telegram/setup?secret=YOUR_SECRET&action=webhook
 *   GET /api/telegram/setup?secret=YOUR_SECRET&action=info
 */

import { NextRequest, NextResponse } from "next/server";
import { TelegramBot } from "@/lib/telegram/bot";
import { getServiceField } from "@/lib/integrations/config-resolver";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Auth
  const secret = request.nextUrl.searchParams.get("secret");
  const expected =
    process.env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_SETUP_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await getServiceField('telegram-bot', 'bot_token');
  if (!token) {
    return NextResponse.json(
      { error: "Telegram bot token not configured" },
      { status: 500 },
    );
  }

  const bot = new TelegramBot(token);
  const action = request.nextUrl.searchParams.get("action") || "all";
  const results: Record<string, unknown> = {};

  // ─── Webhook ───
  if (action === "all" || action === "webhook") {
    const siteUrl =
      (process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com").trim();
    const webhookUrl = `${siteUrl}/api/telegram/webhook`;
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    results.webhook = await bot.setWebhook(webhookUrl, webhookSecret);
    results.webhook_url = webhookUrl;
  }

  // ─── Webhook info ───
  if (action === "info") {
    results.webhookInfo = await bot.getWebhookInfo();
    return NextResponse.json(results);
  }

  // ─── Bot Commands (client) ───
  if (action === "all" || action === "commands") {
    // Default commands (for all users)
    results.commands = await bot.setMyCommands([
      { command: "start", description: "🚀 Почати / Прив'язати акаунт" },
      { command: "search", description: "🔍 Знайти товар" },
      { command: "cart", description: "🛒 Мій кошик" },
      { command: "orders", description: "📦 Мої замовлення" },
      { command: "new", description: "🆕 Новинки тижня" },
      { command: "brands", description: "🏷️ Бренди" },
      { command: "delivery", description: "🚚 Умови доставки" },
      { command: "contacts", description: "📞 Контакти" },
      { command: "link", description: "🔗 Прив'язати акаунт" },
      { command: "help", description: "❓ Що я вмію" },
    ]);

    // Admin commands (only for admins — set per-chat later when admin registers)
    // These are also accessible via text, Claude handles them
  }

  // ─── Bot Description ───
  if (action === "all" || action === "description") {
    results.shortDescription = await bot.setMyShortDescription(
      "ShineShop B2B — AI-асистент nail-магазину 💅",
    );

    results.description = await bot.setMyDescription(
      [
        "Бот ShineShop B2B — оптова косметика для нігтів.",
        "",
        "🔍 Пошук серед 12 000+ товарів",
        "📦 Статус замовлень онлайн",
        "🛒 Кошик та швидке замовлення",
        "🏷️ Оптові ціни для B2B клієнтів",
        "🤖 AI-консультант 24/7",
        "",
        "Натисніть Start щоб почати!",
      ].join("\n"),
    );
  }

  // ─── Chat Menu Button ───
  if (action === "all" || action === "menu") {
    results.menuButton = await bot.setChatMenuButton({
      type: "commands",
    });
  }

  return NextResponse.json({ ok: true, results });
}
