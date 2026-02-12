/**
 * Telegram Client Handler — AI-powered chat with Claude tools
 *
 * Handles: free text messages, commands, callback queries.
 * Uses same 15 tools as website chat, adapted for Telegram output.
 */

import { type TelegramBot, escHtml } from "./bot";
import { chatTools } from "@/lib/chat/tool-definitions";
import { executeToolCall } from "@/lib/chat/tools";
import {
  formatProductCaption,
  buildProductKeyboard,
  formatProductListText,
  buildProductListKeyboard,
  formatOrderForTelegram,
  buildOrderKeyboard,
  formatCartForTelegram,
  formatQuickOrderForTelegram,
} from "./formatters";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_HISTORY = 20;

// ────── Types ──────

export interface ClientContext {
  chatId: number;
  telegramId: number;
  text: string;
  callbackData?: string;
  profileId?: string;
  userName?: string;
  isWholesale: boolean;
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

export async function handleClientMessage(
  bot: TelegramBot,
  ctx: ClientContext,
): Promise<void> {
  // Handle /start
  if (ctx.text === "/start") {
    await clearSession(ctx.telegramId);
    await sendWelcome(bot, ctx);
    return;
  }

  // Handle callback buttons
  if (ctx.callbackData) {
    await handleCallback(bot, ctx);
    return;
  }

  // Handle slash commands
  if (ctx.text.startsWith("/")) {
    await handleCommand(bot, ctx);
    return;
  }

  // Everything else → AI with tools
  await handleAIMessage(bot, ctx);
}

// ────── AI Message Handler (Claude with tools) ──────

async function handleAIMessage(
  bot: TelegramBot,
  ctx: ClientContext,
): Promise<void> {
  // Show typing indicator
  await bot.sendChatAction(ctx.chatId, "typing");

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await bot.sendMessage(
      ctx.chatId,
      "Вибачте, AI-консультант тимчасово недоступний. Зверніться до менеджера.",
    );
    return;
  }

  try {
    // Get session history
    const history = await getSessionHistory(ctx.telegramId);
    history.push({ role: "user", content: ctx.text });

    // Trim history to MAX_HISTORY messages
    while (history.length > MAX_HISTORY) history.shift();

    // Build system prompt
    const systemPrompt = buildClientSystemPrompt(ctx);

    // Get model from config
    const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

    // First Claude call
    let response = await callClaude(apiKey, {
      model,
      max_tokens: 2048,
      system: systemPrompt,
      tools: chatTools,
      messages: history,
    });

    let totalInput = response.usage?.input_tokens || 0;
    let totalOutput = response.usage?.output_tokens || 0;
    const allToolsUsed: string[] = [];

    // Tool use loop
    let iterations = 0;
    while (response.stop_reason === "tool_use" && iterations < 5) {
      iterations++;

      // Refresh typing indicator
      await bot.sendChatAction(ctx.chatId, "typing");

      const toolUseBlocks = (response.content || []).filter(
        (b) => b.type === "tool_use",
      );

      const toolResults = await Promise.all(
        toolUseBlocks.map(
          async (toolUse) => {
            const toolName = String(toolUse.name);
            allToolsUsed.push(toolName);

            try {
              const result = await executeToolCall(
                toolName,
                (toolUse.input || {}) as Record<string, unknown>,
                ctx.profileId,
              );
              return {
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: JSON.stringify(result),
              };
            } catch (err) {
              console.error(`[TgClient] Tool ${toolName} error:`, err);
              return {
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: JSON.stringify({
                  error: "Помилка при виконанні запиту",
                }),
              };
            }
          },
        ),
      );

      // Continue conversation with tool results
      response = await callClaude(apiKey, {
        model,
        max_tokens: 2048,
        system: systemPrompt,
        tools: chatTools,
        messages: [
          ...history,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ],
      });

      totalInput += response.usage?.input_tokens || 0;
      totalOutput += response.usage?.output_tokens || 0;
    }

    // Extract text response
    const textContent = (response.content || [])
      .filter((b) => b.type === "text")
      .map((b) => String(b.text || ""))
      .join("");

    // Save to session
    history.push({ role: "assistant", content: textContent });
    await saveSessionHistory(ctx.telegramId, history, allToolsUsed, totalInput, totalOutput);

    // Send formatted response
    await sendFormattedResponse(bot, ctx.chatId, textContent, ctx);
  } catch (err) {
    console.error("[TgClient] AI error:", err);
    await bot.sendMessage(
      ctx.chatId,
      "Вибачте, виникла помилка. Спробуйте ще раз або зверніться до менеджера.",
    );
  }
}

// ────── Formatted Response Sender ──────

async function sendFormattedResponse(
  bot: TelegramBot,
  chatId: number,
  text: string,
  ctx: ClientContext,
): Promise<void> {
  // Extract structured data markers from Claude's response
  const productMatch = text.match(/<products>([\s\S]*?)<\/products>/);
  const orderMatch = text.match(/<order>([\s\S]*?)<\/order>/);
  const actionsMatch = text.match(/<actions>([\s\S]*?)<\/actions>/);

  // Clean text from structured data
  let cleanText = text
    .replace(/<products>[\s\S]*?<\/products>/g, "")
    .replace(/<order>[\s\S]*?<\/order>/g, "")
    .replace(/<actions>[\s\S]*?<\/actions>/g, "")
    .trim();

  // Send main text message
  if (cleanText) {
    // Quick action buttons if relevant
    const buttons = actionsMatch
      ? parseActions(actionsMatch[1])
      : undefined;

    await bot.sendMessage(chatId, cleanText, {
      parse_mode: "HTML",
      reply_markup: buttons,
    });
  }

  // Send product cards as photos
  if (productMatch) {
    try {
      const products = JSON.parse(productMatch[1]);
      if (Array.isArray(products)) {
        if (products.length === 1) {
          // Single product → photo with buttons
          await sendProductPhoto(bot, chatId, products[0]);
        } else if (products.length <= 5) {
          // Few products → individual photos
          for (const product of products.slice(0, 5)) {
            await sendProductPhoto(bot, chatId, product);
          }
        } else {
          // Many products → text list with number buttons
          const listText = formatProductListText(products.slice(0, 10));
          await bot.sendMessage(chatId, listText, {
            parse_mode: "HTML",
            reply_markup: buildProductListKeyboard(
              products.slice(0, 10),
              products.length > 10,
            ),
          });
        }
      }
    } catch {
      /* ignore parse errors */
    }
  }

  // Send order status
  if (orderMatch) {
    try {
      const order = JSON.parse(orderMatch[1]);
      const orderText = formatOrderForTelegram(order);
      await bot.sendMessage(chatId, orderText, {
        parse_mode: "HTML",
        reply_markup: buildOrderKeyboard(order),
      });
    } catch {
      /* ignore */
    }
  }
}

async function sendProductPhoto(
  bot: TelegramBot,
  chatId: number,
  product: Record<string, unknown>,
): Promise<void> {
  const imageUrl = String(product.image_url || "");
  const caption = formatProductCaption(product as never);
  const keyboard = buildProductKeyboard(product as never);

  if (imageUrl && !imageUrl.includes("placeholder")) {
    try {
      await bot.sendPhoto(chatId, imageUrl, {
        caption,
        reply_markup: keyboard,
      });
      return;
    } catch {
      // Photo failed, fall back to text
    }
  }

  // Fallback: text message
  await bot.sendMessage(chatId, caption, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

function parseActions(
  actionsJson: string,
): { inline_keyboard: Record<string, unknown>[][] } | undefined {
  try {
    const actions = JSON.parse(actionsJson);
    if (!Array.isArray(actions) || actions.length === 0) return undefined;

    const buttons: Record<string, unknown>[][] = [];
    const row: Record<string, unknown>[] = [];

    for (const action of actions) {
      if (action.type === "link" && action.url) {
        row.push({
          text: action.label || "Перейти",
          url: `${SITE_URL}${action.url}`,
        });
      } else if (action.type === "show_more") {
        row.push({
          text: action.label || "Ще",
          callback_data: "more_results",
        });
      }
    }

    if (row.length > 0) buttons.push(row);
    return buttons.length > 0 ? { inline_keyboard: buttons } : undefined;
  } catch {
    return undefined;
  }
}

// ────── Welcome Message ──────

async function sendWelcome(
  bot: TelegramBot,
  ctx: ClientContext,
): Promise<void> {
  const text = ctx.userName
    ? `👋 Привіт, ${escHtml(ctx.userName)}!\n\nЯ Shine — AI-асистент магазину Shine Shop.\nВаш акаунт прив'язаний — бачу ваші замовлення та кошик.\n\nПросто напишіть що шукаєте!`
    : `👋 Привіт! Я Shine — AI-асистент магазину Shine Shop.\n\n12 000+ товарів для nail-індустрії. Просто напишіть що шукаєте!\n\nЩоб бачити замовлення та кошик — прив'яжіть акаунт:`;

  const keyboard: Record<string, unknown>[][] = [];

  if (!ctx.profileId) {
    keyboard.push([
      {
        text: "🔗 Прив'язати акаунт",
        url: `${SITE_URL}/link-telegram`,
      },
    ]);
  }

  keyboard.push(
    [
      { text: "🔍 Знайти товар", callback_data: "quick:search" },
      { text: "🆕 Новинки", callback_data: "quick:new" },
    ],
    [
      { text: "📦 Де замовлення?", callback_data: "quick:orders" },
      { text: "📞 Контакти", callback_data: "quick:contacts" },
    ],
  );

  await bot.sendMessage(ctx.chatId, text, {
    reply_markup: { inline_keyboard: keyboard },
  });
}

// ────── Callback Handler ──────

async function handleCallback(
  bot: TelegramBot,
  ctx: ClientContext,
): Promise<void> {
  const data = ctx.callbackData || "";
  const [action, param] = data.split(":");

  switch (action) {
    case "add_cart": {
      if (!ctx.profileId) {
        await bot.sendMessage(
          ctx.chatId,
          "🔐 Щоб додати в кошик, прив'яжіть акаунт: /link",
        );
        return;
      }
      const result = (await executeToolCall(
        "add_to_cart",
        { product_id: param },
        ctx.profileId,
      )) as Record<string, unknown>;
      await bot.sendMessage(
        ctx.chatId,
        result.success
          ? `✅ ${result.message}`
          : `❌ ${result.error}`,
      );
      break;
    }

    case "quick": {
      const quickMessages: Record<string, string> = {
        search: "Хочу знайти товар",
        new: "Що нового за цей тиждень?",
        orders: "Де моє замовлення?",
        contacts: "Як з вами зв'язатись?",
      };
      if (quickMessages[param]) {
        ctx.text = quickMessages[param];
        ctx.callbackData = undefined;
        await handleAIMessage(bot, ctx);
      }
      break;
    }

    case "reorder": {
      if (!ctx.profileId) {
        await bot.sendMessage(ctx.chatId, "🔐 Прив'яжіть акаунт: /link");
        return;
      }
      ctx.text = `Повторити замовлення ${param}`;
      ctx.callbackData = undefined;
      await handleAIMessage(bot, ctx);
      break;
    }

    case "similar": {
      ctx.text = `Покажи схожі товари на ${param}`;
      ctx.callbackData = undefined;
      await handleAIMessage(bot, ctx);
      break;
    }

    case "brand": {
      ctx.text = `Покажи товари бренду ${param}`;
      ctx.callbackData = undefined;
      await handleAIMessage(bot, ctx);
      break;
    }

    case "detail": {
      ctx.text = `Покажи деталі товару ${param}`;
      ctx.callbackData = undefined;
      await handleAIMessage(bot, ctx);
      break;
    }

    case "notify_stock": {
      if (!ctx.profileId) {
        await bot.sendMessage(ctx.chatId, "🔐 Прив'яжіть акаунт: /link");
        return;
      }
      await executeToolCall(
        "create_waitlist",
        { product_id: param, notify_method: "telegram" },
        ctx.profileId,
      );
      await bot.sendMessage(
        ctx.chatId,
        "🔔 Готово! Повідомлю одразу як товар з'явиться.",
      );
      break;
    }

    case "lang": {
      // Language preference (future: save to profile)
      await bot.sendMessage(
        ctx.chatId,
        param === "uk" ? "Мову змінено на українську 🇺🇦" : "Язык изменён на русский 🇷🇺",
      );
      break;
    }
  }
}

// ────── Command Handler ──────

async function handleCommand(
  bot: TelegramBot,
  ctx: ClientContext,
): Promise<void> {
  const cmd = ctx.text.split(" ")[0].split("@")[0].replace("/", "").toLowerCase();

  const commandMessages: Record<string, string> = {
    cart: "Що в моєму кошику?",
    orders: "Покажи мої замовлення",
    new: "Що нового за цей тиждень?",
    brands: "Які бренди у вас є?",
    delivery: "Розкажи про доставку",
    contacts: "Як з вами зв'язатись?",
    search: "Хочу знайти товар",
    help: "Що ти вмієш?",
  };

  if (cmd === "link") {
    await handleLinkCommand(bot, ctx);
    return;
  }

  if (cmd === "unlink") {
    await handleUnlinkCommand(bot, ctx);
    return;
  }

  if (cmd === "language") {
    await bot.sendMessage(ctx.chatId, "Оберіть мову / Выберите язык:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇺🇦 Українська", callback_data: "lang:uk" },
            { text: "🇷🇺 Русский", callback_data: "lang:ru" },
          ],
        ],
      },
    });
    return;
  }

  if (commandMessages[cmd]) {
    ctx.text = commandMessages[cmd];
    await handleAIMessage(bot, ctx);
    return;
  }

  // Unknown command → treat as AI message
  await handleAIMessage(bot, ctx);
}

// ────── Link / Unlink ──────

async function handleLinkCommand(
  bot: TelegramBot,
  ctx: ClientContext,
): Promise<void> {
  if (ctx.profileId) {
    await bot.sendMessage(
      ctx.chatId,
      "✅ Ваш акаунт вже прив'язаний!",
    );
    return;
  }

  const supabase = createAdminClient();
  const code = Math.random().toString().slice(2, 8);

  // Upsert link code
  await supabase.from("telegram_link_codes").insert({
    telegram_id: ctx.telegramId,
    code,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });

  await bot.sendMessage(
    ctx.chatId,
    `🔗 Для прив'язки акаунта:\n\n1. Відкрийте сайт ${escHtml(SITE_URL)}\n2. Увійдіть в особистий кабінет\n3. Введіть код: <code>${code}</code>\n\n⏱️ Код дійсний 5 хвилин.`,
    { parse_mode: "HTML" },
  );
}

async function handleUnlinkCommand(
  bot: TelegramBot,
  ctx: ClientContext,
): Promise<void> {
  if (!ctx.profileId) {
    await bot.sendMessage(ctx.chatId, "Акаунт не прив'язаний.");
    return;
  }

  const supabase = createAdminClient();
  await supabase
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_username: null })
    .eq("id", ctx.profileId);

  await bot.sendMessage(
    ctx.chatId,
    "✅ Telegram відключено.\n\nЩоб підключити знову — /start",
  );
}

// ────── Session Management ──────

async function getSessionHistory(
  telegramId: number,
): Promise<ClaudeMessage[]> {
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

  // Keep only text content in history (not tool results)
  const cleanMessages = messages
    .filter((m) => typeof m.content === "string")
    .slice(-MAX_HISTORY);

  await supabase.from("telegram_sessions").upsert(
    {
      telegram_id: telegramId,
      messages: cleanMessages,
      message_count: cleanMessages.length,
      is_admin: false,
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

// ────── System Prompt Builder ──────

function buildClientSystemPrompt(ctx: ClientContext): string {
  const userContext = ctx.profileId
    ? `
## Поточний клієнт
- Прив'язаний profile_id: ${ctx.profileId}
- Ім'я: ${ctx.userName || "Не вказано"}
- Тип: ${ctx.isWholesale ? "Оптовий клієнт" : "Роздрібний клієнт"}
Використовуй profileId для tools що потребують авторизації.
${ctx.isWholesale ? "Показуй оптові ціни. Пропонуй швидке замовлення по артикулах." : ""}`
    : `
## Поточний клієнт
Акаунт НЕ прив'язаний. Для кошика та замовлень потрібна прив'язка (/link).`;

  return `
Ти — Shine, AI-асистент інтернет-магазину Shine Shop B2B.
Найбільший nail-постачальник в Одесі. Працює з 2017 року. 12 000+ товарів, 80+ брендів.

## Мова
Визначай мову клієнта і відповідай тією ж мовою. Якщо пише українською — відповідай українською. Якщо російською — російською.

## Тон
Спілкуйся дружньо, з ентузіазмом, але без зайвої води. Можеш використовувати емодзі помірно. Короткі відповіді — це Telegram, люди читають на телефоні.

## Головне правило
ЗАВЖДИ використовуй tools щоб отримати реальні дані. НІКОЛИ не вигадуй ціни, наявність, артикули.
Якщо tool повернув порожній результат — скажи клієнту що нічого не знайшов і запропонуй альтернативу.
Якщо не знаєш відповідь — запропонуй зв'язатись з менеджером.

## Бізнес-правила
- Безкоштовна доставка від 1500₴
- Доставка: Нова Пошта (1-3 дні), УкрПошта (3-7 днів), Самовивіз (Одеса)
- Оплата: LiqPay, Monobank, Накладений платіж, Безготівковий розрахунок
- Повернення: 14 днів, товар не відкритий
- Мін. замовлення опт: 2000₴

## Обмеження
- Не вигадувати ціни та характеристики — тільки з бази
- Не давати медичних порад
- Не порівнювати з конкурентами негативно
- Не обіцяти знижки яких немає в системі
- Складні випадки (конфлікти, пошкоджений товар) → "Зв'язую з менеджером"
${userContext}

## Telegram-специфічне
Ти відповідаєш в Telegram. Форматування:
- Використовуй HTML: <b>жирний</b>, <i>курсив</i>, <code>код</code>
- Emoji для візуалізації
- Короткі повідомлення (1-4 речення, макс 6 для складних питань)
- Коли показуєш товари — обгортай JSON:
  <products>[...масив товарів...]</products>
- Коли показуєш замовлення:
  <order>{...дані замовлення...}</order>
- Не починай з "Привіт" — одразу відповідай на питання

Сайт: ${SITE_URL}
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
