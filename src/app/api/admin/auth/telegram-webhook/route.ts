/**
 * Telegram Admin Bot Webhook — @StrongNailBitsAdminBot
 *
 * Handles:
 * - /start  → onboarding: welcome + request phone contact
 * - /help   → list of commands + login instructions
 * - /status → show linked profile or ask to link
 * - contact → link team_members.telegram_chat_id
 * - auth_confirm:token → confirm auth request
 * - auth_deny:token    → deny auth request
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, phoneLast9 } from "@/lib/admin/phone";
import { sendTelegramMessage, getAdminBotToken } from "@/lib/admin/telegram";

export const dynamic = "force-dynamic";

interface TgUpdate {
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: { id: number; type: string };
    text?: string;
    contact?: {
      phone_number: string;
      first_name?: string;
      last_name?: string;
      user_id?: number;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

// ────── Telegram API helpers ──────

async function tgApi(
  method: string,
  body: Record<string, unknown>,
): Promise<boolean> {
  const token = await getAdminBotToken();
  if (!token) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      console.error(`[AdminBot] tgApi ${method} error:`, err);
    }
    return res.ok;
  } catch (e) {
    console.error(`[AdminBot] tgApi ${method} exception:`, e);
    return false;
  }
}

// ────── Webhook Entry ──────

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = request.headers.get(
      "x-telegram-bot-api-secret-token",
    );
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

// ────── Constants ──────

const ADMIN_URL = "https://strongnailbitsb2b.com/admin";
const ROLE_LABELS: Record<string, string> = {
  ceo: "CEO",
  admin: "Адмін",
  manager: "Менеджер",
  content: "Контент",
  developer: "Розробник",
};

// ────── Update Router ──────

async function handleUpdate(update: TgUpdate): Promise<void> {
  const supabase = createAdminClient();

  const message = update.message;
  const callbackQuery = update.callback_query;
  const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
  const callbackData = callbackQuery?.data;
  const text = message?.text?.trim() || "";

  if (!chatId) return;

  // Only private chats
  if (message?.chat?.type && message.chat.type !== "private") return;

  // ─── Auth confirm callback ───
  if (callbackQuery && callbackData?.startsWith("auth_confirm:")) {
    const authToken = callbackData.replace("auth_confirm:", "");
    await handleAuthConfirm(
      supabase,
      callbackQuery.id,
      chatId,
      callbackQuery.message?.message_id,
      authToken,
    );
    return;
  }

  // ─── Auth deny callback ───
  if (callbackQuery && callbackData?.startsWith("auth_deny:")) {
    const authToken = callbackData.replace("auth_deny:", "");
    await handleAuthDeny(
      supabase,
      callbackQuery.id,
      chatId,
      callbackQuery.message?.message_id,
      authToken,
    );
    return;
  }

  // ─── /start — onboarding ───
  if (text === "/start") {
    await handleStart(chatId);
    return;
  }

  // ─── /help — commands & instructions ───
  if (text === "/help") {
    await handleHelp(chatId);
    return;
  }

  // ─── /status — profile info ───
  if (text === "/status") {
    await handleStatus(supabase, chatId);
    return;
  }

  // ─── Contact shared — link phone ───
  if (message?.contact) {
    await handleContact(supabase, chatId, message.contact.phone_number);
    return;
  }

  // ─── Unknown message — show help ───
  await handleUnknown(chatId);
}

// ────── /start ──────

async function handleStart(chatId: number): Promise<void> {
  await tgApi("sendMessage", {
    chat_id: chatId,
    text: [
      "🟣 *StrongNailBits Admin Panel*",
      "",
      "Вітаю\\! Я бот для входу в адмін\\-панель StrongNailBits\\.",
      "",
      "📋 *Як почати:*",
      "1\\. Надішліть свій номер телефону \\(кнопка нижче\\)",
      "2\\. Відкрийте [адмін\\-панель](https://strongnailbitsb2b.com/admin)",
      "3\\. Введіть свій номер — отримаєте підтвердження тут",
      "",
      "Потрібна допомога? Натисніть /help",
    ].join("\n"),
    parse_mode: "MarkdownV2",
    reply_markup: {
      keyboard: [[{ text: "📱 Надіслати номер", request_contact: true }]],
      one_time_keyboard: true,
      resize_keyboard: true,
    },
  });
}

// ────── /help ──────

async function handleHelp(chatId: number): Promise<void> {
  await tgApi("sendMessage", {
    chat_id: chatId,
    text: [
      "📖 *Доступні команди:*",
      "",
      "/start — Прив'язати номер телефону",
      "/status — Мій профіль та статус",
      "/help — Ця довідка",
      "",
      "🔐 *Як увійти в адмінку:*",
      "1\\. Відкрийте [strongnailbitsb2b\\.com/admin](https://strongnailbitsb2b.com/admin)",
      "2\\. Введіть номер телефону",
      "3\\. Натисніть «✅ Підтвердити вхід» тут у боті",
      "",
      "⚡ Вхід миттєвий — сторінка оновиться автоматично\\.",
    ].join("\n"),
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [[{ text: "🔗 Відкрити адмінку", url: ADMIN_URL }]],
    },
  });
}

// ────── /status ──────

async function handleStatus(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
): Promise<void> {
  const { data: member } = await supabase
    .from("team_members")
    .select("name, phone, role, is_active")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!member) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: [
        "⚠️ Ваш Telegram ще не прив'язано до акаунта.",
        "",
        "Натисніть /start і надішліть свій номер телефону.",
      ].join("\n"),
    });
    return;
  }

  // Mask phone: +380*****1234
  const masked =
    member.phone.slice(0, 4) + "*****" + member.phone.slice(-4);
  const roleLabel = ROLE_LABELS[member.role] || member.role;
  const statusLabel = member.is_active ? "✅ Активний" : "⛔ Деактивовано";

  await tgApi("sendMessage", {
    chat_id: chatId,
    text: [
      "👤 *Ваш профіль:*",
      "",
      `*Ім'я:* ${escapeMarkdown(member.name)}`,
      `*Роль:* ${escapeMarkdown(roleLabel)}`,
      `*Телефон:* \`${masked}\``,
      `*Статус:* ${statusLabel}`,
    ].join("\n"),
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [[{ text: "🔗 Відкрити адмінку", url: ADMIN_URL }]],
    },
  });
}

// ────── Contact shared ──────

async function handleContact(
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
  phoneNumber: string,
): Promise<void> {
  const phone = normalizePhone(phoneNumber);
  const last9 = phoneLast9(phone);

  // Search by last 9 digits — format-independent matching
  const { data: members } = await supabase
    .from("team_members")
    .select("id, name, phone, telegram_chat_id")
    .eq("is_active", true);

  const member =
    members?.find((m) => phoneLast9(m.phone) === last9) || null;

  if (!member) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: [
        "❌ Цей номер не знайдено в системі.",
        "",
        "Зверніться до адміністратора для додавання вашого номера.",
      ].join("\n"),
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  if (member.telegram_chat_id && member.telegram_chat_id !== chatId) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: [
        "⚠️ Цей номер вже прив'язано до іншого Telegram.",
        "Зверніться до адміністратора.",
      ].join("\n"),
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
      `✅ *Акаунт прив'язано\\!*`,
      "",
      `${escapeMarkdown(member.name)}, тепер ви можете входити в адмін\\-панель\\.`,
      "",
      "📋 *Що далі:*",
      "1\\. Відкрийте адмінку \\(кнопка нижче\\)",
      "2\\. Введіть номер телефону",
      "3\\. Підтвердіть вхід тут у боті",
      "",
      "Потрібна допомога? /help",
    ].join("\n"),
    parse_mode: "MarkdownV2",
    reply_markup: {
      remove_keyboard: true,
    },
  });

  // Send separate message with inline button (can't mix keyboard removal + inline)
  await tgApi("sendMessage", {
    chat_id: chatId,
    text: "👇 Перейдіть в адмінку:",
    reply_markup: {
      inline_keyboard: [[{ text: "🔗 Відкрити адмінку", url: ADMIN_URL }]],
    },
  });
}

// ────── Unknown message ──────

async function handleUnknown(chatId: number): Promise<void> {
  await tgApi("sendMessage", {
    chat_id: chatId,
    text: [
      "Це бот для авторизації в адмін-панелі StrongNailBits.",
      "",
      "Доступні команди:",
      "/start — Прив'язати номер",
      "/status — Мій профіль",
      "/help — Довідка",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [[{ text: "🔗 Відкрити адмінку", url: ADMIN_URL }]],
    },
  });
}

// ────── Helpers ──────

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

// ────── Auth Confirm ──────

async function handleAuthConfirm(
  supabase: ReturnType<typeof createAdminClient>,
  callbackQueryId: string,
  chatId: number,
  messageId: number | undefined,
  authToken: string,
): Promise<void> {
  // First — answer callback to remove loading spinner on the button
  await tgApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
  });

  const { data: authReq } = await supabase
    .from("auth_requests")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("token", authToken)
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (!authReq) {
    await sendTelegramMessage(
      chatId,
      "⏰ Запит вже не активний. Спробуйте ще раз.",
    );
    return;
  }

  const timeStr = new Date().toLocaleString("uk-UA", {
    timeZone: "Europe/Kyiv",
  });

  if (messageId) {
    await tgApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `✅ Вхід підтверджено о ${timeStr}`,
    });
  } else {
    await sendTelegramMessage(
      chatId,
      "✅ Вхід підтверджено! Сторінка оновиться автоматично.",
    );
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
  // First — answer callback
  await tgApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
  });

  await supabase
    .from("auth_requests")
    .update({ status: "expired" })
    .eq("token", authToken)
    .eq("status", "pending");

  if (messageId) {
    await tgApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: "❌ Вхід відхилено. Якщо це не ви — зверніться до адміністратора.",
    });
  } else {
    await sendTelegramMessage(
      chatId,
      "🚫 Вхід відхилено. Якщо це не ви — змініть пароль.",
    );
  }
}
