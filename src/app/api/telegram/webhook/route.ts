/**
 * Telegram Bot Webhook — ShineShop B2B client bot
 *
 * UX Philosophy:
 * - Persistent bottom keyboard = main navigation (like tabs on a site)
 * - Inline buttons = only for links to site and contextual actions
 * - Any free text = AI consultant (no "I don't understand" messages)
 * - Never greet repeatedly, never send walls of text
 * - Be helpful, not annoying
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneVariants, normalizePhone } from "@/lib/sms/alphasms";
import { notifyTelegramLinked } from "@/lib/telegram/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com";

// ────── Persistent Keyboard (always visible at bottom) ──────

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "📦 Мої замовлення" }, { text: "👤 Мій кабінет" }],
    [{ text: "🛒 Каталог" }, { text: "💬 Менеджер" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

// Button texts for matching
const BTN = {
  ORDERS: "📦 Мої замовлення",
  ACCOUNT: "👤 Мій кабінет",
  CATALOG: "🛒 Каталог",
  MANAGER: "💬 Менеджер",
};

// ────── Types ──────

interface TgUpdate {
  message?: {
    message_id: number;
    from: TgFrom;
    chat: { id: number; type: string };
    text?: string;
    contact?: { phone_number: string; first_name?: string; last_name?: string; user_id?: number };
  };
  callback_query?: {
    id: string;
    from: TgFrom;
    message?: { chat: { id: number } };
    data?: string;
  };
}

interface TgFrom {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

// ────── Webhook Entry ──────

function verifySecret(request: NextRequest): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const update: TgUpdate = await request.json();
    await handleUpdate(update);
  } catch (err) {
    console.error("[TgBot] Error:", err);
  }
  return NextResponse.json({ ok: true });
}

// ────── Router ──────

async function handleUpdate(update: TgUpdate): Promise<void> {
  // Callback queries (inline buttons)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat.id;
    if (!chatId) return;
    await answerCb(cb.id);

    const d = cb.data || "";
    if (d === "orders") await showOrders(chatId);
    else if (d === "account") await showAccount(chatId);
    else if (d === "catalog") await showCatalog(chatId);
    else if (d === "site_orders") {/* link button, no action */}
    else if (d === "site_account") {/* link button, no action */}
    return;
  }

  // Regular messages
  const msg = update.message;
  if (!msg || msg.chat.type !== "private") return;
  const chatId = msg.chat.id;
  const from = msg.from;

  // Phone contact shared
  if (msg.contact) {
    await handleContactShared(chatId, from, msg.contact);
    return;
  }

  const text = msg.text?.trim() || "";

  // Slash commands
  if (text.startsWith("/")) {
    const cmd = text.split(" ")[0].split("@")[0].toLowerCase();
    if (cmd === "/start") return handleStart(chatId, from);
    if (cmd === "/orders") return showOrders(chatId);
    if (cmd === "/account" || cmd === "/status") return showAccount(chatId);
    if (cmd === "/catalog") return showCatalog(chatId);
    if (cmd === "/manager" || cmd === "/help") return showManager(chatId);
    if (cmd === "/unlink") return handleUnlink(chatId);
    // Unknown command → treat as AI question
    return handleAI(chatId, text);
  }

  // Persistent keyboard button presses
  if (text === BTN.ORDERS) return showOrders(chatId);
  if (text === BTN.ACCOUNT) return showAccount(chatId);
  if (text === BTN.CATALOG) return showCatalog(chatId);
  if (text === BTN.MANAGER) return showManager(chatId);

  // Everything else → AI consultant
  return handleAI(chatId, text);
}

// ────── /start — onboarding ──────

async function handleStart(chatId: number, from: TgFrom): Promise<void> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (profile) {
    // Already linked → show keyboard and brief welcome
    const name = profile.first_name || from.first_name || "";
    await send(chatId, {
      text: `${name}, з поверненням! ✨\nОберіть потрібний розділ нижче 👇`,
      reply_markup: MAIN_KEYBOARD,
    });
    return;
  }

  // New user → ask for phone to link account
  await send(chatId, {
    text: [
      `${from.first_name || ""}, вітаємо у ShineShop B2B! ✨`,
      "",
      "Підключіть акаунт, щоб отримати:",
      "• 📦 Статус замовлень онлайн",
      "• 🏷️ Ваші персональні знижки",
      "• 🤖 AI-консультант 24/7",
      "",
      "👇 Натисніть кнопку нижче:",
    ].join("\n"),
    reply_markup: {
      keyboard: [
        [{ text: "📱 Підключити мій акаунт", request_contact: true }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

// ────── Contact Shared — link profile ──────

async function handleContactShared(
  chatId: number,
  from: TgFrom,
  contact: NonNullable<TgUpdate["message"]>["contact"],
): Promise<void> {
  if (!contact) return;

  const phone = normalizePhone(contact.phone_number);
  const variants = phoneVariants(phone);
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, telegram_chat_id")
    .in("phone", variants)
    .limit(1)
    .maybeSingle();

  if (!profile) {
    await send(chatId, {
      text: [
        "Не знайшли акаунт з цим номером.",
        "",
        "Зареєструйтесь на сайті, потім поверніться:",
      ].join("\n"),
      reply_markup: {
        inline_keyboard: [
          [{ text: "📝 Реєстрація на сайті", url: `${SITE}/register` }],
        ],
      },
    });
    return;
  }

  if (profile.telegram_chat_id && profile.telegram_chat_id !== chatId) {
    await send(chatId, {
      text: "Цей номер вже підключено до іншого Telegram. Зверніться до менеджера.",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💬 Написати менеджеру", url: `${SITE}/contacts` }],
        ],
      },
    });
    return;
  }

  // Link
  await supabase
    .from("profiles")
    .update({ telegram_chat_id: chatId, telegram_username: from.username || null })
    .eq("id", profile.id);

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

  // Show main keyboard immediately
  await send(chatId, {
    text: [
      "✅ Акаунт підключено!",
      "",
      `${name}, тепер вам доступні:`,
      "📦 Замовлення — статус у реальному часі",
      "🏷️ Знижки — ваші персональні умови",
      "🤖 Консультант — питайте будь-що",
      "",
      "Оберіть розділ нижче 👇",
    ].join("\n"),
    reply_markup: MAIN_KEYBOARD,
  });

  // Notify admin (fire-and-forget)
  notifyTelegramLinked({
    name: name || "Невідомий",
    phone: `+${phone}`,
    telegramUsername: from.username,
  }).catch(() => {});
}

// ────── 📦 Orders ──────

async function showOrders(chatId: number): Promise<void> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) return askToLink(chatId);

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!orders || orders.length === 0) {
    await send(chatId, {
      text: "У вас поки немає замовлень.",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🛒 Перейти до каталогу", url: `${SITE}/catalog` }],
        ],
      },
    });
    return;
  }

  const emoji: Record<string, string> = {
    pending: "⏳", processing: "⚙️", shipped: "🚚", delivered: "✅", cancelled: "❌",
  };

  const statusLabel: Record<string, string> = {
    pending: "Очікує", processing: "Обробляється", shipped: "Відправлено",
    delivered: "Доставлено", cancelled: "Скасовано",
  };

  const lines: string[] = [];
  for (const o of orders) {
    const e = emoji[o.status] || "📋";
    const label = statusLabel[o.status] || o.status;
    const date = new Date(o.created_at).toLocaleDateString("uk-UA");
    const num = o.order_number || o.id.slice(0, 8);
    const sum = (o.total || 0).toLocaleString("uk-UA");
    lines.push(`${e} <b>#${num}</b> — ${sum} ₴\n     ${label} · ${date}`);
  }

  await send(chatId, {
    text: `📦 <b>Ваші замовлення</b>\n\n${lines.join("\n\n")}`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Всі замовлення на сайті", url: `${SITE}/account/orders` }],
      ],
    },
  });
}

// ────── 👤 Account ──────

async function showAccount(chatId: number): Promise<void> {
  const supabase = createAdminClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("first_name, last_name, company, type, discount_percent, total_orders, total_spent")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!p) return askToLink(chatId);

  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  const typeLabel = p.type === "wholesale" ? "Оптовий" : "Роздрібний";

  const lines = [
    `👤 <b>${name}</b>`,
    p.company ? `🏢 ${p.company}` : null,
    `📊 Тип: ${typeLabel}`,
    "",
    `📦 Замовлень: <b>${p.total_orders || 0}</b>`,
    `💰 Сума: <b>${(p.total_spent || 0).toLocaleString("uk-UA")} ₴</b>`,
    p.discount_percent ? `🏷️ Знижка: <b>${p.discount_percent}%</b>` : null,
  ];

  await send(chatId, {
    text: lines.filter(Boolean).join("\n"),
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "👤 Особистий кабінет", url: `${SITE}/account` }],
      ],
    },
  });
}

// ────── 🛒 Catalog ──────

async function showCatalog(chatId: number): Promise<void> {
  await send(chatId, {
    text: [
      "🛒 <b>Каталог ShineShop B2B</b>",
      "",
      "Гель-лаки · Бази · Топи · Фрези",
      "Лампи · Декор · Рідини · Інструменти",
    ].join("\n"),
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🌐 Відкрити каталог", url: `${SITE}/catalog` }],
        [
          { text: "🔥 Новинки", url: `${SITE}/catalog?sort=newest` },
          { text: "💰 Акції", url: `${SITE}/catalog?sort=discount` },
        ],
      ],
    },
  });
}

// ────── 💬 Manager ──────

async function showManager(chatId: number): Promise<void> {
  await send(chatId, {
    text: [
      "💬 <b>Зв'язок з менеджером</b>",
      "",
      "📞 Телефон: +380 (XX) XXX-XX-XX",
      "🕐 Пн-Пт: 9:00–18:00",
      "",
      "Або напишіть ваше питання прямо тут — AI-консультант відповість миттєво!",
    ].join("\n"),
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🌐 Контакти на сайті", url: `${SITE}/contacts` }],
      ],
    },
  });
}

// ────── 🤖 AI Consultant ──────

async function handleAI(chatId: number, text: string): Promise<void> {
  // Try full AI with customer context
  try {
    const { smartBotReply } = await import("@/lib/ai/funnel-ai");
    const reply = await smartBotReply(text, chatId);
    if (reply) {
      await send(chatId, { text: reply });
      return;
    }
  } catch (err) {
    console.error("[TgBot] AI error:", err);
  }

  // Fallback: simpler Claude call
  try {
    const { askClaude, isAIConfigured } = await import("@/lib/ai/claude");
    if (await isAIConfigured()) {
      const reply = await askClaude(`Клієнт запитує: "${text}"`, {
        system: "Ти — консультант ShineShop B2B (оптова косметика для нігтів). Відповідай УКРАЇНСЬКОЮ, 1-3 речення, по суті. Без привітань. Не вигадуй ціни — кажи перевірити на shineshopb2b.com/catalog",
        fast: true,
        maxTokens: 300,
      });
      if (reply && reply.length > 5) {
        await send(chatId, { text: reply });
        return;
      }
    }
  } catch (err) {
    console.error("[TgBot] Fallback AI error:", err);
  }

  // Final fallback
  await send(chatId, {
    text: "Вибачте, зараз не можу відповісти. Спробуйте пізніше або зверніться до менеджера.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💬 Менеджер", url: `${SITE}/contacts` }],
      ],
    },
  });
}

// ────── Unlink ──────

async function handleUnlink(chatId: number): Promise<void> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!profile) {
    await send(chatId, { text: "Акаунт не підключено." });
    return;
  }

  await supabase
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_username: null })
    .eq("id", profile.id);

  await send(chatId, {
    text: "✅ Telegram відключено.\n\nЩоб підключити знову — /start",
    reply_markup: { remove_keyboard: true },
  });
}

// ────── Helpers ──────

async function askToLink(chatId: number): Promise<void> {
  await send(chatId, {
    text: "Спочатку підключіть акаунт — натисніть /start",
  });
}

async function answerCb(cbId: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: cbId }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* silent */ }
}

async function send(
  chatId: number,
  params: {
    text: string;
    parse_mode?: "HTML" | "MarkdownV2";
    reply_markup?: Record<string, unknown>;
  },
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: params.text,
        parse_mode: params.parse_mode,
        disable_web_page_preview: true,
        ...(params.reply_markup ? { reply_markup: params.reply_markup } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[TgBot] Send failed:", res.status, err);
    }
  } catch (err) {
    console.error("[TgBot] Send error:", err);
  }
}
