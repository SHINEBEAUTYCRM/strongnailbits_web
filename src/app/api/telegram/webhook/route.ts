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
  // Verify webhook secret (mandatory — reject if not configured or mismatch)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[TgWebhook] TELEGRAM_WEBHOOK_SECRET not set — rejecting request");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (headerSecret !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const { getServiceField } = await import('@/lib/integrations/config-resolver');
  const token = await getServiceField('telegram-bot', 'bot_token');
  if (!token) {
    console.error("[TgWebhook] Telegram bot token not configured");
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

  // ─── Client Registration: /start reg_TOKEN (deep link) ───
  if (text.startsWith('/start reg_')) {
    const regToken = text.replace('/start reg_', '').trim();
    await handleClientRegStart(bot, supabase, chatId, telegramId, from!, regToken);
    return;
  }

  // ─── Client Auth: /start auth_TOKEN (deep link) ───
  if (text.startsWith('/start auth_')) {
    const authToken = text.replace('/start auth_', '').trim();
    await handleClientAuthStart(bot, supabase, chatId, telegramId, from!, authToken);
    return;
  }

  // ─── Client Auth callbacks ───
  if (callbackData?.startsWith('client_auth_confirm:')) {
    const authToken = callbackData.replace('client_auth_confirm:', '');
    await handleClientAuthCallback(bot, supabase, callbackQuery!, chatId, authToken, true);
    return;
  }
  if (callbackData?.startsWith('client_auth_deny:')) {
    const authToken = callbackData.replace('client_auth_deny:', '');
    await handleClientAuthCallback(bot, supabase, callbackQuery!, chatId, authToken, false);
    return;
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
      const profileRaw = admin.profiles;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as any as Record<string, unknown> | null;
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
  from: { first_name?: string; last_name?: string; username?: string },
  contact: { phone_number: string; first_name?: string; last_name?: string },
): Promise<void> {
  const rawContactPhone = contact.phone_number.replace(/\D/g, "");

  // ─── Check if this is a registration flow ───
  const { data: pendingReg } = await supabase
    .from("auth_requests")
    .select("id, token, phone, status")
    .eq("type", "client_register")
    .eq("status", "pending")
    .eq("ip_address", chatId.toString())
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingReg) {
    const regPhone = pendingReg.phone.replace(/\D/g, "");
    const contactPhone = rawContactPhone.startsWith("38")
      ? rawContactPhone
      : rawContactPhone.startsWith("0")
        ? "38" + rawContactPhone
        : rawContactPhone;

    const regLast9 = regPhone.slice(-9);
    const contactLast9 = contactPhone.slice(-9);

    if (regLast9 !== contactLast9) {
      await bot.sendMessage(
        chatId,
        "❌ Номер не збігається.\n\nВи вводили інший номер на сайті. Спробуйте ще раз.",
        { reply_markup: { remove_keyboard: true } },
      );
      return;
    }

    // Phone verified — check if profile already exists (match by last 9 digits)
    const last9 = rawContactPhone.slice(-9);

    const { data: allMatchingProfiles } = await supabase
      .from("profiles")
      .select("id, first_name, phone, telegram_chat_id")
      .or(`phone.like.%${last9}`);

    const existingProfile = allMatchingProfiles?.[0] || null;

    if (existingProfile) {
      await supabase
        .from("profiles")
        .update({ telegram_chat_id: chatId, telegram_username: from.username || null })
        .eq("id", existingProfile.id);

      await supabase
        .from("auth_requests")
        .update({
          type: "client",
          profile_id: existingProfile.id,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", pendingReg.id);

      await bot.sendMessage(
        chatId,
        `✅ Акаунт знайдено та підключено!\n\n` +
          `${existingProfile.first_name || "Друже"}, поверніться на сайт — він оновиться автоматично.`,
        { reply_markup: { remove_keyboard: true } },
      );
      return;
    }

    // Create new profile — always store as 380XXXXXXXXX
    const normalizedPhone = (() => {
      const digits = rawContactPhone.replace(/\D/g, "");
      if (digits.startsWith("380") && digits.length === 12) return digits;
      if (digits.startsWith("80") && digits.length === 11) return "3" + digits;
      if (digits.startsWith("0") && digits.length === 10) return "38" + digits;
      if (digits.length === 9) return "380" + digits;
      return digits;
    })();

    const { data: newProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        phone: normalizedPhone,
        first_name: from.first_name || contact.first_name || "",
        last_name: from.last_name || "",
        telegram_chat_id: chatId,
        telegram_username: from.username || null,
        role: "user",
        type: "retail",
      })
      .select("id")
      .single();

    if (profileError) {
      console.error("[TgWebhook] Profile create error:", profileError);
      await bot.sendMessage(chatId, "❌ Помилка реєстрації. Спробуйте ще раз.", {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    await supabase
      .from("auth_requests")
      .update({
        profile_id: newProfile.id,
        phone: normalizedPhone,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", pendingReg.id);

    await bot.sendMessage(
      chatId,
      `✅ Реєстрацію завершено!\n\n` +
        `${from.first_name || "Друже"}, ваш акаунт створено.\n` +
        `Поверніться на сайт — він оновиться автоматично.\n\n` +
        `Тепер вам доступні:\n` +
        `📦 Замовлення — статус у реальному часі\n` +
        `🛒 Кошик — додавайте через бот\n` +
        `🤖 AI-консультант — питайте будь-що`,
      { reply_markup: { remove_keyboard: true } },
    );
    return;
  }

  // ─── Original contact handling (non-registration) ───
  const variants = [
    rawContactPhone,
    rawContactPhone.startsWith("38") ? rawContactPhone.slice(2) : rawContactPhone,
    rawContactPhone.startsWith("380") ? rawContactPhone.slice(3) : rawContactPhone,
    `+${rawContactPhone}`,
    `+38${rawContactPhone}`,
    `+380${rawContactPhone}`,
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

// ────── Client Registration: /start reg_TOKEN (deep link) ──────

async function handleClientRegStart(
  bot: TelegramBot,
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
  _telegramId: number,
  from: { first_name?: string; last_name?: string; username?: string },
  regToken: string,
): Promise<void> {
  const { data: authReq } = await supabase
    .from("auth_requests")
    .select("id, token, phone, status, expires_at")
    .eq("token", regToken)
    .eq("type", "client_register")
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!authReq) {
    await bot.sendMessage(
      chatId,
      "⏰ Запит на реєстрацію не знайдено або час вийшов.\n\nСпробуйте ще раз на сайті.",
    );
    return;
  }

  // Store chatId in ip_address field so handleContactShared can find this request
  await supabase
    .from("auth_requests")
    .update({ ip_address: chatId.toString() })
    .eq("id", authReq.id);

  const masked =
    authReq.phone.length > 8
      ? authReq.phone.slice(0, 4) + "*****" + authReq.phone.slice(-4)
      : authReq.phone;

  await bot.sendMessage(
    chatId,
    `👋 Вітаємо в ShineShop!\n\n` +
      `Для реєстрації акаунту (${masked}) надішліть свій номер телефону кнопкою нижче.\n\n` +
      `Це потрібно для підтвердження, що номер належить вам.`,
    {
      reply_markup: {
        keyboard: [[{ text: "📱 Надіслати номер", request_contact: true }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    },
  );
}

// ────── Client Auth: /start auth_TOKEN (deep link) ──────

async function handleClientAuthStart(
  bot: TelegramBot,
  supabase: ReturnType<typeof createAdminClient>,
  chatId: number,
  telegramId: number,
  from: { first_name?: string; username?: string },
  authToken: string,
): Promise<void> {
  const { data: authReq } = await supabase
    .from("auth_requests")
    .select("id, token, phone, profile_id, status, expires_at")
    .eq("token", authToken)
    .eq("type", "client")
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!authReq) {
    await bot.sendMessage(chatId, "⏰ Запит на вхід не знайдено або час вийшов. Спробуйте ще раз на сайті.");
    return;
  }

  if (authReq.profile_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, telegram_chat_id")
      .eq("id", authReq.profile_id)
      .single();

    if (profile && !profile.telegram_chat_id) {
      await supabase
        .from("profiles")
        .update({ telegram_chat_id: chatId, telegram_username: from.username || null })
        .eq("id", profile.id);
    } else if (profile && profile.telegram_chat_id && profile.telegram_chat_id !== chatId) {
      await bot.sendMessage(chatId, "⚠️ Цей номер вже прив'язано до іншого Telegram акаунту.");
      return;
    }
  }

  const masked = authReq.phone.slice(0, 4) + "*****" + authReq.phone.slice(-4);
  const timeStr = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });

  await bot.sendMessage(
    chatId,
    `🔐 <b>Запит на вхід в ShineShop</b>\n\n📱 ${masked}\n🕐 ${timeStr}\n\nЦе ви?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Підтвердити вхід", callback_data: `client_auth_confirm:${authToken}` },
            { text: "❌ Це не я", callback_data: `client_auth_deny:${authToken}` },
          ],
        ],
      },
    },
  );
}

// ────── Client Auth: confirm/deny callback ──────

async function handleClientAuthCallback(
  bot: TelegramBot,
  supabase: ReturnType<typeof createAdminClient>,
  callbackQuery: { id: string; message?: { chat: { id: number }; message_id: number } },
  chatId: number,
  authToken: string,
  confirm: boolean,
): Promise<void> {
  if (confirm) {
    const { data: authReq } = await supabase
      .from("auth_requests")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("token", authToken)
      .eq("type", "client")
      .eq("status", "pending")
      .gte("expires_at", new Date().toISOString())
      .select("id")
      .maybeSingle();

    const messageId = callbackQuery.message?.message_id;
    if (authReq && messageId) {
      const timeStr = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });
      await bot.editMessageText(chatId, messageId, `✅ Вхід підтверджено о ${timeStr}\n\nПоверніться на сайт — він оновиться автоматично.`);
    } else if (!authReq) {
      await bot.sendMessage(chatId, "⏰ Запит вже не активний. Спробуйте ще раз.");
    }
  } else {
    await supabase
      .from("auth_requests")
      .update({ status: "expired" })
      .eq("token", authToken)
      .eq("type", "client")
      .eq("status", "pending");

    const messageId = callbackQuery.message?.message_id;
    if (messageId) {
      await bot.editMessageText(chatId, messageId, "❌ Вхід відхилено. Якщо це не ви — зверніться до підтримки.");
    }
  }
}
