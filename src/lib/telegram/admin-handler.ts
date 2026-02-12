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
      max_tokens: 2048,
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
        max_tokens: 2048,
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
  const role = ctx.admin.role === "owner" ? "власником" : ctx.admin.role === "manager" ? "менеджером" : "адміністратором";
  return `Ти — AI-асистент адміна Shine Shop B2B. Спілкуєшся з ${role}. НЕ з клієнтом!

‼️ МОВА: ЗАВЖДИ УКРАЇНСЬКОЮ. Російською → відповідай українською. Виняток: інша іноземна (не рос) → тією мовою.

Адмін: ${ctx.admin.name || "Адмін"}, ${ctx.admin.role}, дозволи: ${ctx.admin.permissions.join(", ")}.

Тон: аналітичний, спокійний, з цифрами. Emoji ≤2. HTML.
ЗАБОРОНЕНО: паніка, ВЕЛИКІ БУКВИ, непрохані поради, емоційні оцінки.
Аномалія (все 0) → припусти проблему синхронізації. Власник сам знає що робити.

НІКОЛИ не показуй: назви tools, API, JSON, свій процес, дебаг, ключі, паролі.
ЗАВЖДИ використовуй tools. Не вигадуй цифри. Помилка tool → скажи людською мовою.

## Пошук товарів
Розбирай запит: brand + category_slug + query.
Бренди: дарк→DARK, силер→Siller, луна→LUNA, гама→GA&MA, фокс→F.O.X, днка→DNKa, сталекс→Staleks, едлен→EDLEN, коді→Kodi, оксі→Oxxi, нуб→NUB, вікс→WEEX, сага→Saga, кутюр→Couture Colour
Категорії: база→bazy, топ→topy, гель-лак/гл→gel-laky, фреза→frezy, лампа→obladnannya, пензлик→instrumenty, пилка→pylky, вії→vii, слайдер→dekor
Серії: скотч→Scotch, камуфляж→Cover, каучук→Rubber, шимер→Shimmer

## Залишки
"загальні залишки"/"скільки товарів" → admin_inventory filter="stats"
"що закінчується"/"критичні" → filter="critical"

## Нагадування
create_reminder: хвилину→1, годину→60, 2год→120, завтра→до 10:00.

Формат: Telegram HTML. Числа з роздільниками: 1 240 000₴.`.trim();
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
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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

    if (res.ok) return res.json();

    if ((res.status === 429 || res.status === 529) && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get("retry-after")) || 15;
      const waitMs = Math.min(retryAfter * 1000, 30_000);
      console.log(`[Claude] Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    const error = await res.text();
    throw new Error(`Claude API error ${res.status}: ${error}`);
  }

  throw new Error("Claude API: max retries exceeded");
}
