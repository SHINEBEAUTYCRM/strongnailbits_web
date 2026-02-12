/**
 * Telegram Admin Handler — AI-powered admin assistant
 *
 * Handles: dashboard, orders management, inventory, clients, finance,
 * content creation, broadcast, chatbot analytics.
 * Uses 12 admin-specific tools.
 */

import { type TelegramBot, escHtml } from "./bot";
import { adminToolDefinitions, executeAdminToolCall } from "./admin-tools";
import { fmtMoney, fmtNum } from "./formatters";
import { createAdminClient } from "@/lib/supabase/admin";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_HISTORY = 30;

// ────── Clean Bot Response (filter out internal details) ──────

function cleanBotResponse(text: string): string {
  return text
    .replace(/`?[a-z_]+\([^)]*\)`?/gi, "")
    .replace(/я обращаюсь к функции[^.]*\./gi, "")
    .replace(/вызываю (функцию|tool)[^.]*\./gi, "")
    .replace(/выполняю запрос[^.]*\./gi, "")
    .replace(/використовую (функцію|tool)[^.]*\./gi, "")
    .replace(/зараз шукаю[^.]*\./gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{[^{}]*"type"[^{}]*\}/g, "")
    .replace(/возможные проблемы:[\s\S]*?(?=\n\n|\n[А-ЯA-Z]|$)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ────── Persistent Reply Keyboard (Admin) ──────

const ADMIN_KEYBOARD = {
  keyboard: [
    [{ text: "📊 Дашборд" }, { text: "📋 Замовлення" }],
    [{ text: "📦 Залишки" }, { text: "👥 Клієнти" }],
    [{ text: "💰 Фінанси" }, { text: "⚙️ Налаштування" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

/** Map persistent button text → AI query */
const ADMIN_BUTTON_MESSAGES: Record<string, string> = {
  "📊 Дашборд": "/start",
  "📋 Замовлення": "Покажи нові замовлення",
  "📦 Залишки": "Що закінчується? Критичні залишки",
  "👥 Клієнти": "Хто найбільше купує?",
  "💰 Фінанси": "Фінансовий звіт за сьогодні",
  "⚙️ Налаштування": "Покажи налаштування сповіщень",
};

// ────── Types ──────

export interface AdminContext {
  chatId: number;
  telegramId: number;
  text: string;
  callbackData?: string;
  admin: {
    id: string;
    role: string;
    permissions: string[];
    name?: string;
  };
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: unknown;
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
}

interface ClaudeResponse {
  content: ClaudeContentBlock[];
  stop_reason: string;
  usage?: { input_tokens: number; output_tokens: number };
}

// ────── Main Entry ──────

export async function handleAdminMessage(
  bot: TelegramBot,
  ctx: AdminContext,
): Promise<void> {
  // Handle /start → dashboard
  if (ctx.text === "/start") {
    await clearSession(ctx.telegramId);
    await sendAdminDashboard(bot, ctx);
    return;
  }

  // Handle callback buttons
  if (ctx.callbackData) {
    await handleAdminCallback(bot, ctx);
    return;
  }

  // Handle persistent keyboard buttons
  if (ADMIN_BUTTON_MESSAGES[ctx.text]) {
    const mapped = ADMIN_BUTTON_MESSAGES[ctx.text];
    if (mapped === "/start") {
      await clearSession(ctx.telegramId);
      await sendAdminDashboard(bot, ctx);
      return;
    }
    ctx.text = mapped;
    await handleAdminAI(bot, ctx);
    return;
  }

  // Handle slash commands
  if (ctx.text.startsWith("/")) {
    await handleAdminCommand(bot, ctx);
    return;
  }

  // Everything else → AI with admin tools
  await handleAdminAI(bot, ctx);
}

// ────── Admin AI Handler ──────

async function handleAdminAI(
  bot: TelegramBot,
  ctx: AdminContext,
): Promise<void> {
  // Show "processing" message and hide keyboard while working
  const waitMsg = await bot.sendMessage(ctx.chatId, "⏳ Шукаю інформацію...", {
    reply_markup: { remove_keyboard: true },
  });
  const waitMsgId = waitMsg.result
    ? ((waitMsg.result as Record<string, unknown>)?.message_id as number | undefined)
    : undefined;
  await bot.sendChatAction(ctx.chatId, "typing");

  const apiKey = (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    if (waitMsgId) await bot.deleteMessage(ctx.chatId, waitMsgId);
    await bot.sendMessage(ctx.chatId, "❌ Claude API не налаштовано.", { reply_markup: ADMIN_KEYBOARD });
    return;
  }

  try {
    const history = await getSessionHistory(ctx.telegramId);
    history.push({ role: "user", content: ctx.text });
    while (history.length > MAX_HISTORY) history.shift();

    const systemPrompt = buildAdminSystemPrompt(ctx);
    const model = (process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514").trim();

    let response = await callClaude(apiKey, {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      tools: adminToolDefinitions,
      messages: history,
    });

    let totalInput = response.usage?.input_tokens || 0;
    let totalOutput = response.usage?.output_tokens || 0;
    const allToolsUsed: string[] = [];

    // Tool use loop
    let iterations = 0;
    while (response.stop_reason === "tool_use" && iterations < 8) {
      iterations++;
      await bot.sendChatAction(ctx.chatId, "typing");

      const toolUseBlocks = (response.content || []).filter(
        (b) => b.type === "tool_use",
      );

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          const toolName = String(toolUse.name);
          allToolsUsed.push(toolName);

          try {
            const result = await executeAdminToolCall(
              toolName,
              {
                ...((toolUse.input || {}) as Record<string, unknown>),
                _telegram_id: ctx.telegramId,
              },
            );
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            };
          } catch (err) {
            console.error(`[TgAdmin] Tool ${toolName} error:`, err);
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: "Помилка при виконанні" }),
            };
          }
        }),
      );

      response = await callClaude(apiKey, {
        model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: adminToolDefinitions,
        messages: [
          ...history,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ],
      });

      totalInput += response.usage?.input_tokens || 0;
      totalOutput += response.usage?.output_tokens || 0;
    }

    // Extract text
    const rawTextContent = (response.content || [])
      .filter((b) => b.type === "text")
      .map((b) => String(b.text || ""))
      .join("");

    // Clean internal details from response
    const textContent = cleanBotResponse(rawTextContent);

    // Save session
    history.push({ role: "assistant", content: textContent });
    await saveSessionHistory(ctx.telegramId, history, allToolsUsed, totalInput, totalOutput);

    // Delete "waiting" message and send response with keyboard
    if (waitMsgId) await bot.deleteMessage(ctx.chatId, waitMsgId);
    await bot.sendMessage(ctx.chatId, textContent || "Готово.", {
      parse_mode: "HTML",
      reply_markup: ADMIN_KEYBOARD,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[TgAdmin] AI error:", errMsg);
    if (waitMsgId) await bot.deleteMessage(ctx.chatId, waitMsgId);
    const userMsg = errMsg.includes("429") || errMsg.includes("rate_limit")
      ? "Зачекайте хвилинку — забагато запитів. Спробуйте через 30 секунд."
      : "❌ Помилка AI. Спробуйте ще раз.";
    await bot.sendMessage(ctx.chatId, userMsg, {
      reply_markup: ADMIN_KEYBOARD,
    });
  }
}

// ────── Dashboard ──────

async function sendAdminDashboard(
  bot: TelegramBot,
  ctx: AdminContext,
): Promise<void> {
  await bot.sendChatAction(ctx.chatId, "typing");

  const supabase = createAdminClient();

  // Today's stats
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const { data: todayOrders } = await supabase
    .from("orders")
    .select("total, items")
    .gte("created_at", startOfDay);

  const ordersCount = todayOrders?.length || 0;
  const revenue = todayOrders?.reduce((s, o) => s + Number(o.total || 0), 0) || 0;
  const avgCheck = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  // New customers today
  const { count: newCustomers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay);

  // Pending orders
  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("status", ["new", "pending"]);

  // Critical stock
  const { count: criticalStock } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .lt("quantity", 10)
    .gt("quantity", 0);

  const name = ctx.admin.name || "Адмін";
  const roleEmoji = ctx.admin.role === "owner" ? "👑" : ctx.admin.role === "manager" ? "👔" : "🔐";

  const lines = [
    `${roleEmoji} <b>Режим адміністратора</b>`,
    ``,
    `Привіт, ${escHtml(name)}! Ось що відбувається:`,
    ``,
    `📊 <b>Сьогодні:</b>`,
    `• ${ordersCount} замовлень на ${fmtMoney(revenue)}`,
    `• ${newCustomers || 0} нових клієнтів`,
    `• Середній чек: ${fmtMoney(avgCheck)}`,
  ];

  // Attention section
  const attentionItems: string[] = [];
  if (pendingOrders && pendingOrders > 0) {
    attentionItems.push(`• ${pendingOrders} замовлень чекають підтвердження`);
  }
  if (criticalStock && criticalStock > 0) {
    attentionItems.push(`• ${criticalStock} товарів з критичним залишком`);
  }

  if (attentionItems.length > 0) {
    lines.push(``);
    lines.push(`⚠️ <b>Потребує уваги:</b>`);
    lines.push(...attentionItems);
  }

  // Send dashboard with persistent reply keyboard
  await bot.sendMessage(ctx.chatId, lines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: ADMIN_KEYBOARD,
  });
}

// ────── Admin Callback Handler ──────

async function handleAdminCallback(
  bot: TelegramBot,
  ctx: AdminContext,
): Promise<void> {
  const data = ctx.callbackData || "";
  const [prefix, action, param] = data.split(":");

  if (prefix === "admin") {
    const actionMessages: Record<string, string> = {
      orders: "Покажи нові замовлення",
      stats: "Як справи сьогодні? Дай повну аналітику",
      stock: "Що закінчується?",
      clients: "Хто найбільше купує?",
    };
    if (actionMessages[action]) {
      ctx.text = actionMessages[action];
      ctx.callbackData = undefined;
      await handleAdminAI(bot, ctx);
    }
    return;
  }

  if (prefix === "confirm_order") {
    const result = (await executeAdminToolCall("admin_order_action", {
      order_id: action,
      action: "confirm",
    })) as Record<string, unknown>;
    await bot.sendMessage(
      ctx.chatId,
      result.success
        ? `✅ ${result.message}`
        : `❌ ${result.error}`,
    );
    return;
  }

  if (prefix === "cancel_order") {
    const result = (await executeAdminToolCall("admin_order_action", {
      order_id: action,
      action: "cancel",
    })) as Record<string, unknown>;
    await bot.sendMessage(
      ctx.chatId,
      result.success
        ? `❌ ${result.message}`
        : `❌ ${result.error}`,
    );
    return;
  }

  if (prefix === "order_detail") {
    ctx.text = `Покажи детальну інформацію про замовлення з id ${action}`;
    ctx.callbackData = undefined;
    await handleAdminAI(bot, ctx);
    return;
  }

  if (prefix === "reply_client") {
    await bot.sendMessage(
      ctx.chatId,
      `💬 Напишіть відповідь для клієнта ${action}:`,
    );
    // TODO: Save state that next message is a reply to this client
    return;
  }
}

// ────── Admin Command Handler ──────

async function handleAdminCommand(
  bot: TelegramBot,
  ctx: AdminContext,
): Promise<void> {
  const parts = ctx.text.split(" ");
  const cmd = parts[0].split("@")[0].replace("/", "").toLowerCase();
  const arg = parts.slice(1).join(" ");

  const commandMessages: Record<string, string> = {
    orders: arg ? `Покажи замовлення ${arg}` : "Покажи нові замовлення що чекають підтвердження",
    stats: arg ? `Аналітика за ${arg}` : "Як справи сьогодні?",
    stock: "Що закінчується? Критичні залишки",
    clients: arg ? `Знайди клієнта ${arg}` : "Хто найбільше купує?",
    find: arg ? `Знайди клієнта ${arg}` : "Хто найбільше купує?",
    post: arg ? `Напиши пост для Instagram про ${arg}` : "Допоможи створити пост для Instagram",
    notify: arg ? `Розсилка: ${arg}` : "Допоможи з розсилкою клієнтам",
    settings: "Покажи поточні налаштування бота",
    notifications: "Покажи налаштування сповіщень",
  };

  if (cmd === "start") {
    await clearSession(ctx.telegramId);
    await sendAdminDashboard(bot, ctx);
    return;
  }

  if (commandMessages[cmd]) {
    ctx.text = commandMessages[cmd];
    await handleAdminAI(bot, ctx);
    return;
  }

  // Unknown command → AI
  await handleAdminAI(bot, ctx);
}

// ────── Session Management ──────

async function getSessionHistory(telegramId: number): Promise<ClaudeMessage[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("telegram_sessions")
    .select("messages")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (data?.messages && Array.isArray(data.messages)) {
    return data.messages as ClaudeMessage[];
  }
  return [];
}

async function saveSessionHistory(
  telegramId: number,
  messages: ClaudeMessage[],
  toolsUsed: string[],
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const supabase = createAdminClient();
  const cleanMessages = messages
    .filter((m) => typeof m.content === "string")
    .slice(-MAX_HISTORY);

  await supabase.from("telegram_sessions").upsert(
    {
      telegram_id: telegramId,
      messages: cleanMessages,
      message_count: cleanMessages.length,
      is_admin: true,
      tools_used: toolsUsed,
      total_input_tokens: inputTokens,
      total_output_tokens: outputTokens,
      last_activity: new Date().toISOString(),
    },
    { onConflict: "telegram_id" },
  );
}

async function clearSession(telegramId: number): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("telegram_sessions")
    .update({
      messages: [],
      message_count: 0,
      tools_used: [],
      total_input_tokens: 0,
      total_output_tokens: 0,
    })
    .eq("telegram_id", telegramId);
}

// ────── Admin System Prompt ──────

function buildAdminSystemPrompt(ctx: AdminContext): string {
  return `
Ти — AI-асистент для адміністратора інтернет-магазину Shine Shop B2B.
Ти спілкуєшся з ${ctx.admin.role === "owner" ? "власником" : ctx.admin.role === "manager" ? "менеджером" : "адміністратором"} магазину. НЕ з клієнтом!

## ‼️ МОВА — НАЙВАЖЛИВІШЕ ПРАВИЛО ‼️
Ти ЗАВЖДИ відповідаєш ТІЛЬКИ УКРАЇНСЬКОЮ МОВОЮ. Це не рекомендація, це АБСОЛЮТНЕ правило.
- Адмін пише російською → ти відповідаєш УКРАЇНСЬКОЮ
- Адмін пише українською → ти відповідаєш УКРАЇНСЬКОЮ
- НІКОЛИ не пиши російською. Жодного слова. Навіть якщо просять.
Єдиний виняток: англійська, польська або інша іноземна мова (НЕ російська) — тоді відповідай тією мовою.

## Адмін
- Ім'я: ${ctx.admin.name || "Адмін"}
- Роль: ${ctx.admin.role}
- Дозволи: ${ctx.admin.permissions.join(", ")}

## Тон і поведінка
Ти — аналітичний помічник. Показуєш ДАНІ, не робиш висновків за власника.

ЗАБОРОНЕНО:
- Кричати ВЕЛИКИМИ БУКВАМИ
- Панікувати: "КРИТИЧНА СИТУАЦІЯ!", "ТЕРМІНОВО!", "МАГАЗИН НЕ МОЖЕ ПРАЦЮВАТИ!"
- Давати непрохані поради: "потрібно поповнити", "рекомендую перевірити"
- Додавати емоційні оцінки: "жахливо", "катастрофа", "критично"
- Використовувати більше 2 emoji на повідомлення

ПРАВИЛЬНО:
Спокійно, з цифрами:
"📊 Залишки: 12 847 позицій, з них 11 200 в наявності.
1 647 позицій з нульовим залишком.
Топ-5 з мінімальним залишком:
1. DARK Base 30мл — 8 шт
2. Siller Top 30мл — 12 шт
..."

Якщо бачиш аномалію (все по нулях, раптово пусто) —
припусти проблему з даними:
"📊 Всі 20 позицій показують залишок 0.
Це може бути проблема синхронізації з CS-Cart.
Перевір: запусти sync вручну або подивись таблицю products в Supabase."

Власник сам знає що робити зі своїм бізнесом. Твоя задача — дати чіткі цифри.

## АБСОЛЮТНА ЗАБОРОНА — Внутрішня кухня
НІКОЛИ не показуй:
- Назви функцій/tools: search_products, admin_inventory, dashboard_stats і т.д.
- Технічні деталі: API, endpoint, JSON, параметри, input_schema
- Свій процес: "Я зараз шукаю...", "Обращаюсь к функции...", "Выполняю запрос..."
- Помилки API: якщо tool впав — скажи людською мовою "Не вдалось завантажити дані, спробуйте ще раз"
- Прохання допомоги: "Подскажи какие данные должен возвращать запрос?"
- Дебаг інформацію: "Возможные проблемы: 1️⃣ Неправильно интерпретирую ответ..."

Ти маєш tools які працюють автоматично. Ти їх ВИКЛИКАЄШ, а не описуєш.
Адмін бачить ТІЛЬКИ результат — цифри, товари, статуси.

## Що робиш
- Показуєш аналітику продажів, замовлень, клієнтів
- Керуєш замовленнями (підтвердження, скасування)
- Моніториш залишки і попереджаєш про критичні
- Знаходиш клієнтів і показуєш їх історію
- Створюєш контент для соцмереж
- Відповідаєш клієнтам від імені менеджера
- Надсилаєш масові повідомлення

## Залишки
Коли адмін питає "загальні залишки" або "скільки товарів" → використай admin_inventory з filter="stats" для загальної статистики.
Коли питає "що закінчується" або "критичні" → використай filter="critical".

## Розумний пошук товарів

Коли адмін шукає товар — СПОЧАТКУ розбери запит на компоненти. НЕ пхай весь текст в query одним рядком.

### Словник брендів (кирилиця → латиниця):
дарк/dark → brand: "DARK"
силер/siller → brand: "Siller"
луна/luna → brand: "LUNA"
гама/gama → brand: "GA&MA"
фокс/fox → brand: "F.O.X"
днка/dnka → brand: "DNKa"
стілекс/сталекс/staleks → brand: "Staleks"
едлен/edlen → brand: "EDLEN"
коді/kodi → brand: "Kodi"
оксі/oksi → brand: "Oxxi"
нуб/nub → brand: "NUB"
вікс/weex → brand: "WEEX"
сага/saga → brand: "Saga"
мі нейл/my nail → brand: "My Nail"
кутюр/couture → brand: "Couture Colour"
дезік/dezik → brand: "DEZIK"

### Словник категорій:
база/base → category_slug: "bazy"
топ/top → category_slug: "topy"
гель-лак/гл/гелак → category_slug: "gel-laky"
гель для нарощування → category_slug: "geli-dlya-naroshchuvannya"
фреза/фрезер → category_slug: "frezy"
лампа → category_slug: "obladnannya"
пензлик/кисть → category_slug: "instrumenty"
знежирювач → category_slug: "materialy"
пилка → category_slug: "pylky"
вії/ресниці → category_slug: "vii"
слайдер → category_slug: "dekor"

### Словник серій:
скотч/scotch → "Scotch" в query
камуфляж/cover → "Cover" в query
каучук/rubber → "Rubber" в query
shimmer/шимер → "Shimmer" в query

## Нагадування
Коли адмін просить нагадати — визнач час і створи нагадування через create_reminder.
Парсинг часу: "через хвилину" → 1, "через годину" → 60, "через 2 години" → 120, "завтра" → до завтра 10:00.

## Формат
В Telegram. HTML форматування.
Великі числа — з роздільниками: 1 240 000₴.

## Безпека
НІКОЛИ не показуй:
- API ключі, паролі
- Повні номери карт клієнтів
- Внутрішні ID систем (окрім номерів замовлень)

## Важливо
ЗАВЖДИ використовуй tools для отримання реальних даних. Не вигадуй цифри.
Якщо tool повернув помилку — скажи адміну коротко і людською мовою.
`.trim();
}

// ────── Claude API Call ──────

async function callClaude(
  apiKey: string,
  params: {
    model: string;
    max_tokens: number;
    system: string;
    tools: unknown[];
    messages: unknown[];
  },
): Promise<ClaudeResponse> {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Claude API error ${res.status}: ${error}`);
  }

  return res.json();
}
