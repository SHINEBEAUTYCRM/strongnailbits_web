/**
 * Telegram Bot Webhook — ShineShop B2B
 *
 * Entry point for all Telegram updates.
 * Routes to admin or client handler based on admin_users table.
 *
 * Architecture:
 *   Telegram update → identify user → admin_users? → Admin Handler
 *                                   → profiles?   → Client Handler (linked)
 *                                   → neither     → Client Handler (anonymous)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TelegramBot } from "@/lib/telegram/bot";
import { handleClientMessage, type ClientContext } from "@/lib/telegram/client-handler";
import { handleAdminMessage, type AdminContext } from "@/lib/telegram/admin-handler";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Claude tool loops can take time

// ────── Types ──────

interface TgUpdate {
  message?: {
    message_id: number;
    from: { id: number; first_name?: string; last_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    contact?: { phone_number: string; first_name?: string; last_name?: string; user_id?: number };
    photo?: unknown[];
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string; last_name?: string; username?: string };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

// ────── Webhook Entry ──────

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (headerSecret !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const update: TgUpdate = await request.json();
    await handleUpdate(update);
  } catch (err) {
    console.error("[TgWebhook] Error:", err);
  }

  // Always return 200 to Telegram (otherwise it retries)
  return NextResponse.json({ ok: true });
}

// ────── Update Router ──────

async function handleUpdate(update: TgUpdate): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[TgWebhook] TELEGRAM_BOT_TOKEN not set");
    return;
  }

  const bot = new TelegramBot(token);
  const supabase = createAdminClient();

  // Extract common data
  const message = update.message;
  const callbackQuery = update.callback_query;

  const telegramId = message?.from?.id || callbackQuery?.from?.id;
  const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
  const text = message?.text?.trim() || "";
  const callbackData = callbackQuery?.data;
  const from = message?.from || callbackQuery?.from;

  if (!telegramId || !chatId) return;

  // Only handle private chats
  if (message?.chat?.type && message.chat.type !== "private") return;

  // Answer callback query immediately (removes loading spinner)
  if (callbackQuery) {
    await bot.answerCallbackQuery(callbackQuery.id);
  }

  // Handle contact shared (for phone-based linking)
  if (message?.contact) {
    await handleContactShared(bot, supabase, chatId, telegramId, from!, message.contact);
    return;
  }

  try {
    // ─── 1. Check if admin ───
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, role, permissions, profile_id, profiles(first_name)")
      .eq("telegram_id", telegramId)
      .eq("is_active", true)
      .maybeSingle();

    if (admin) {
      const profile = admin.profiles as Record<string, unknown> | null;
      const adminCtx: AdminContext = {
        chatId,
        telegramId,
        text,
        callbackData,
        admin: {
          id: admin.id,
          role: admin.role,
          permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
          name: (profile?.first_name as string) || from?.first_name || undefined,
        },
      };

      await handleAdminMessage(bot, adminCtx);
      return;
    }

    // ─── 2. Check if linked client ───
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, first_name, type, discount_percent")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    const clientCtx: ClientContext = {
      chatId,
      telegramId,
      text,
      callbackData,
      profileId: profile?.id,
      userName: profile?.first_name || from?.first_name || undefined,
      isWholesale: profile?.type === "wholesale",
    };

    await handleClientMessage(bot, clientCtx);
  } catch (err) {
    console.error("[TgWebhook] Handler error:", err);
    await bot.sendMessage(
      chatId,
      "Виникла помилка. Спробуйте ще раз через хвилину.",
    );
  }
}

// ────── Contact Shared (Phone Linking) ──────

async function handleContactShared(
  bot: TelegramBot,
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
  telegramId: number,
  from: { first_name?: string; username?: string },
  contact: { phone_number: string; first_name?: string },
): Promise<void> {
  // Normalize phone
  const rawPhone = contact.phone_number.replace(/\D/g, "");
  const variants = [
    rawPhone,
    rawPhone.startsWith("38") ? rawPhone.slice(2) : rawPhone,
    rawPhone.startsWith("380") ? rawPhone.slice(3) : rawPhone,
    `+${rawPhone}`,
    `+38${rawPhone}`,
    `+380${rawPhone}`,
  ].filter((v) => v.length >= 9);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, telegram_chat_id")
    .in("phone", variants)
    .limit(1)
    .maybeSingle();

  if (!profile) {
    const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com";
    await bot.sendMessage(chatId, "Не знайшли акаунт з цим номером.\n\nЗареєструйтесь на сайті:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📝 Реєстрація на сайті", url: `${SITE}/register` }],
        ],
      },
    });
    return;
  }

  if (profile.telegram_chat_id && profile.telegram_chat_id !== chatId) {
    await bot.sendMessage(chatId, "Цей номер вже підключено до іншого Telegram. Зверніться до менеджера.");
    return;
  }

  // Link
  await supabase
    .from("profiles")
    .update({ telegram_chat_id: chatId, telegram_username: from.username || null })
    .eq("id", profile.id);

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

  await bot.sendMessage(chatId, [
    "✅ Акаунт підключено!",
    "",
    `${name}, тепер вам доступні:`,
    "📦 Замовлення — статус у реальному часі",
    "🛒 Кошик — додавайте через бот",
    "🤖 AI-консультант — питайте будь-що",
    "",
    "Просто напишіть що шукаєте! 👇",
  ].join("\n"));
}
