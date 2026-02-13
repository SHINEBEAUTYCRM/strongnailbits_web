/**
 * Telegram Admin Bot Webhook — @ShineShopAdminBot
 *
 * Handles:
 * - /start → request phone contact → link team_members.telegram_chat_id
 * - auth_confirm:token → confirm auth request
 * - auth_deny:token → deny auth request
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

interface TgUpdate {
  message?: {
    message_id: number;
    from: { id: number; first_name?: string; last_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    contact?: { phone_number: string; first_name?: string; last_name?: string; user_id?: number };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string; last_name?: string; username?: string };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

const ADMIN_BOT_TOKEN = () => process.env.TELEGRAM_ADMIN_BOT_TOKEN || "";

// ────── Telegram API helpers ──────

async function tgApi(method: string, body: Record<string, unknown>): Promise<boolean> {
  const token = ADMIN_BOT_TOKEN();
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
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
    console.error("[AdminBotWebhook] Error:", err);
  }

  return NextResponse.json({ ok: true });
}

// ────── Update Router ──────

async function handleUpdate(update: TgUpdate): Promise<void> {
  const supabase = createAdminClient();

  const message = update.message;
  const callbackQuery = update.callback_query;
  const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
  const callbackData = callbackQuery?.data;

  if (!chatId) return;

  // Only private chats
  if (message?.chat?.type && message.chat.type !== "private") return;

  // ─── Auth confirm callback ───
  if (callbackQuery && callbackData?.startsWith("auth_confirm:")) {
    const authToken = callbackData.replace("auth_confirm:", "");
    await handleAuthConfirm(supabase, callbackQuery.id, chatId, callbackQuery.message?.message_id, authToken);
    return;
  }

  // ─── Auth deny callback ───
  if (callbackQuery && callbackData?.startsWith("auth_deny:")) {
    const authToken = callbackData.replace("auth_deny:", "");
    await handleAuthDeny(supabase, callbackQuery.id, chatId, callbackQuery.message?.message_id, authToken);
    return;
  }

  // ─── /start command ───
  if (message?.text?.trim() === "/start") {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "👋 Вітаю! Я бот адмін-панелі ShineShop.\n\nНадішліть свій номер телефону для прив'язки акаунта:",
      reply_markup: {
        keyboard: [[{ text: "📱 Надіслати номер", request_contact: true }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    });
    return;
  }

  // ─── Contact shared ───
  if (message?.contact) {
    const phone = normalizePhone(message.contact.phone_number);

    const { data: member } = await supabase
      .from("team_members")
      .select("id, name, telegram_chat_id")
      .eq("phone", phone)
      .eq("is_active", true)
      .maybeSingle();

    if (!member) {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: "❌ Цей номер не знайдено в системі.\nЗверніться до адміністратора для додавання.",
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    if (member.telegram_chat_id && member.telegram_chat_id !== chatId) {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: "⚠️ Цей номер вже прив'язано до іншого Telegram.\nЗверніться до адміністратора.",
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    await supabase
      .from("team_members")
      .update({ telegram_chat_id: chatId })
      .eq("id", member.id);

    await tgApi("sendMessage", {
      chat_id: chatId,
      text: [
        "✅ Акаунт прив'язано!",
        "",
        `${member.name}, тепер ви можете входити в адмін-панель через Telegram.`,
        "",
        "Відкрийте shineshopb2b.com/admin і введіть свій номер телефону.",
      ].join("\n"),
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  // ─── Unknown message ───
  await tgApi("sendMessage", {
    chat_id: chatId,
    text: "Це бот для авторизації в адмін-панелі ShineShop.\nНатисніть /start для початку.",
  });
}

// ────── Auth Confirm ──────

async function handleAuthConfirm(
  supabase: ReturnType<typeof createAdminClient>,
  callbackQueryId: string,
  chatId: number,
  messageId: number | undefined,
  authToken: string,
): Promise<void> {
  const { data: authReq } = await supabase
    .from("auth_requests")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("token", authToken)
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (!authReq) {
    await tgApi("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: "❌ Запит вже оброблено або прострочено",
    });
    return;
  }

  await tgApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: "✅ Вхід підтверджено!",
  });

  const timeStr = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });
  if (messageId) {
    await tgApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `✅ Вхід підтверджено о ${timeStr}`,
    });
  }
}

// ────── Auth Deny ──────

async function handleAuthDeny(
  supabase: ReturnType<typeof createAdminClient>,
  callbackQueryId: string,
  chatId: number,
  messageId: number | undefined,
  authToken: string,
): Promise<void> {
  await supabase
    .from("auth_requests")
    .update({ status: "expired" })
    .eq("token", authToken)
    .eq("status", "pending");

  await tgApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: "❌ Запит відхилено",
  });

  if (messageId) {
    await tgApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: "❌ Вхід відхилено. Якщо це не ви — зверніться до адміністратора.",
    });
  }
}
