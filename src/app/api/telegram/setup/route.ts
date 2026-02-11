/**
 * One-time Telegram Bot setup:
 * - Sets bot commands (hamburger menu)
 * - Sets bot description
 * 
 * Call: GET /api/telegram/setup?secret=YOUR_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Simple auth
  const secret = request.nextUrl.searchParams.get("secret");
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
  }

  const api = `https://api.telegram.org/bot${token}`;
  const results: Record<string, unknown> = {};

  // 1. Set bot commands (hamburger menu)
  try {
    const res = await fetch(`${api}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "🚀 Підключити акаунт" },
          { command: "orders", description: "📦 Мої замовлення" },
          { command: "account", description: "👤 Мій кабінет" },
          { command: "catalog", description: "🛒 Каталог" },
          { command: "manager", description: "💬 Зв'язок з менеджером" },
        ],
      }),
    });
    results.commands = await res.json();
  } catch (err) {
    results.commands = { error: String(err) };
  }

  // 2. Set bot short description (shown in profile)
  try {
    const res = await fetch(`${api}/setMyShortDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        short_description: "ShineShop B2B — замовлення, знижки, AI-консультант 🤖",
      }),
    });
    results.shortDescription = await res.json();
  } catch (err) {
    results.shortDescription = { error: String(err) };
  }

  // 3. Set bot description (shown before /start)
  try {
    const res = await fetch(`${api}/setMyDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Бот ShineShop B2B — оптова косметика для нігтів.\n\n📦 Статус замовлень\n🏷️ Персональні знижки\n🤖 AI-консультант 24/7\n\nНатисніть Start щоб підключити акаунт.",
      }),
    });
    results.description = await res.json();
  } catch (err) {
    results.description = { error: String(err) };
  }

  // 4. Set chat menu button to commands
  try {
    const res = await fetch(`${api}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "commands",
        },
      }),
    });
    results.menuButton = await res.json();
  } catch (err) {
    results.menuButton = { error: String(err) };
  }

  return NextResponse.json({ ok: true, results });
}
