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
import { trackFunnelEvent } from "@/lib/funnels/tracker";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com").trim();
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_HISTORY = 20;

// ────── Clean Bot Response (filter out internal details) ──────

function cleanBotResponse(text: string): string {
  return text
    // Remove function calls like search_products(...)
    .replace(/`?[a-z_]+\([^)]*\)`?/gi, "")
    // Remove "Я обращаюсь к функции..."
    .replace(/я обращаюсь к функции[^.]*\./gi, "")
    .replace(/вызываю (функцию|tool)[^.]*\./gi, "")
    .replace(/выполняю запрос[^.]*\./gi, "")
    .replace(/використовую (функцію|tool)[^.]*\./gi, "")
    .replace(/зараз шукаю[^.]*\./gi, "")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove JSON blocks
    .replace(/\{[^{}]*"type"[^{}]*\}/g, "")
    // Remove "Возможные проблемы"
    .replace(/возможные проблемы:[\s\S]*?(?=\n\n|\n[А-ЯA-Z]|$)/gi, "")
    // Clean triple+ newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ────── Persistent Reply Keyboard ──────

const CLIENT_KEYBOARD = {
  keyboard: [
    [{ text: "🔍 Пошук" }, { text: "🛒 Кошик" }],
    [{ text: "📦 Замовлення" }, { text: "🆕 Новинки" }],
    [{ text: "🔄 Мої витратні" }, { text: "📞 Контакти" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

/** Map persistent button text → AI query */
const BUTTON_MESSAGES: Record<string, string> = {
  "🔍 Пошук": "Хочу знайти товар",
  "🛒 Кошик": "Що в моєму кошику?",
  "📦 Замовлення": "Покажи мої замовлення",
  "🆕 Новинки": "Що нового за цей тиждень?",
  "🔄 Мої витратні": "Покажи мої витратні матеріали. Якщо список порожній — запропонуй додати перший товар.",
  "📞 Контакти": "Як з вами зв'язатись?",
};

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

    // Fire funnel event for welcome series (fire-and-forget)
    trackFunnelEvent({
      event: "telegram_start",
      profileId: ctx.profileId || undefined,
      name: ctx.userName || undefined,
      metadata: {
        source: "telegram",
        telegram_chat_id: ctx.chatId,
      },
    }).catch((err) =>
      console.error("[ClientHandler] Funnel event error:", err),
    );

    return;
  }

  // Handle callback buttons
  if (ctx.callbackData) {
    await handleCallback(bot, ctx);
    return;
  }

  // Handle persistent keyboard buttons
  if (BUTTON_MESSAGES[ctx.text]) {
    ctx.text = BUTTON_MESSAGES[ctx.text];
    await handleAIMessage(bot, ctx);
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
  // Show "processing" message and hide keyboard while working
  const waitMsg = await bot.sendMessage(ctx.chatId, "⏳ Шукаю інформацію...", {
    reply_markup: { remove_keyboard: true },
  });
  const waitResult = (waitMsg as unknown as Record<string, unknown>)?.result as Record<string, unknown> | undefined;
  const waitMsgId = waitResult?.message_id as number | undefined;
  await bot.sendChatAction(ctx.chatId, "typing");

  const apiKey = (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    if (waitMsgId) await bot.deleteMessage(ctx.chatId, waitMsgId);
    await bot.sendMessage(
      ctx.chatId,
      "Вибачте, AI-консультант тимчасово недоступний. Зверніться до менеджера.",
      { reply_markup: CLIENT_KEYBOARD },
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
    const model = (process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514").trim();

    // First Claude call
    let response = await callClaude(apiKey, {
      model,
      max_tokens: 1024,
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
                {
                  ...((toolUse.input || {}) as Record<string, unknown>),
                  _telegram_id: ctx.telegramId,
                  _profile_id: ctx.profileId,
                },
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
        max_tokens: 1024,
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
    const rawTextContent = (response.content || [])
      .filter((b) => b.type === "text")
      .map((b) => String(b.text || ""))
      .join("");

    // Clean internal details from response
    const textContent = cleanBotResponse(rawTextContent);

    // Save to session
    history.push({ role: "assistant", content: textContent });
    await saveSessionHistory(ctx.telegramId, history, allToolsUsed, totalInput, totalOutput);

    // Delete "waiting" message and send formatted response
    if (waitMsgId) await bot.deleteMessage(ctx.chatId, waitMsgId);
    await sendFormattedResponse(bot, ctx.chatId, textContent, ctx);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[TgClient] AI error:", errMsg);
    if (waitMsgId) await bot.deleteMessage(ctx.chatId, waitMsgId);
    // User-friendly message — never show API details
    const userMsg = errMsg.includes("429") || errMsg.includes("rate_limit")
      ? "Зачекайте хвилинку — забагато запитів. Спробуйте ще раз через 30 секунд."
      : "Вибачте, виникла помилка. Спробуйте ще раз або зверніться до менеджера.";
    await bot.sendMessage(ctx.chatId, userMsg, {
      reply_markup: CLIENT_KEYBOARD,
    });
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
  const cleanText = text
    .replace(/<products>[\s\S]*?<\/products>/g, "")
    .replace(/<order>[\s\S]*?<\/order>/g, "")
    .replace(/<actions>[\s\S]*?<\/actions>/g, "")
    .trim();

  // Track if we've restored the keyboard yet
  let keyboardRestored = false;

  // Send main text message
  if (cleanText) {
    const buttons = actionsMatch
      ? parseActions(actionsMatch[1])
      : undefined;

    // If no inline buttons, use this message to restore the persistent keyboard
    if (!buttons && !productMatch && !orderMatch) {
      await bot.sendMessage(chatId, cleanText, {
        parse_mode: "HTML",
        reply_markup: CLIENT_KEYBOARD,
      });
      keyboardRestored = true;
    } else {
      await bot.sendMessage(chatId, cleanText, {
        parse_mode: "HTML",
        reply_markup: buttons,
      });
    }
  }

  // Send product cards as photos
  if (productMatch) {
    try {
      const products = JSON.parse(productMatch[1]);
      if (Array.isArray(products)) {
        if (products.length === 1) {
          await sendProductPhoto(bot, chatId, products[0]);
        } else if (products.length <= 5) {
          for (const product of products.slice(0, 5)) {
            await sendProductPhoto(bot, chatId, product);
          }
        } else {
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

  // Ensure keyboard is always restored after the response
  if (!keyboardRestored) {
    await bot.sendMessage(chatId, "👇 Оберіть дію:", {
      reply_markup: CLIENT_KEYBOARD,
    });
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
  const greeting = ctx.userName
    ? `👋 Привіт, <b>${escHtml(ctx.userName)}</b>!`
    : `👋 Привіт!`;

  const lines = [
    greeting,
    ``,
    `Я <b>Shine</b> — AI-асистент магазину Shine Shop 💅`,
    ``,
    `🔍 12 000+ товарів для nail-індустрії`,
    `🤖 Запитуйте — я знайду та порекомендую`,
    `📦 Статус замовлень у реальному часі`,
  ];

  if (ctx.profileId) {
    lines.push(``, `✅ Ваш акаунт прив'язаний — бачу замовлення та кошик.`);
  } else {
    lines.push(``, `🔗 <a href="${SITE_URL}/link-telegram">Прив'язати акаунт</a> — для кошика та замовлень`);
  }

  lines.push(``, `Просто напишіть що шукаєте або натисніть кнопку 👇`);

  // Send with persistent reply keyboard
  await bot.sendMessage(ctx.chatId, lines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: CLIENT_KEYBOARD,
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

    case "search_reminder": {
      // Search from reminder callback — param is the search query
      ctx.text = param;
      ctx.callbackData = undefined;
      await handleAIMessage(bot, ctx);
      break;
    }

    case "dismiss_reminder": {
      await bot.sendMessage(ctx.chatId, "✅ Нагадування закрито");
      break;
    }

    case "consumable_action": {
      // param format: "action:consumable_id" e.g. "skip_once:uuid-here"
      const [consAction, consumableId] = param.split(":");
      if (consAction && consumableId) {
        const result = (await executeToolCall(
          "update_consumable",
          { consumable_id: consumableId, action: consAction },
          ctx.profileId,
        )) as Record<string, unknown>;
        await bot.sendMessage(
          ctx.chatId,
          result.success ? `✅ ${result.message}` : `❌ ${result.error}`,
        );
      }
      break;
    }

    case "my_consumables": {
      ctx.text = "Покажи мої витратні матеріали";
      ctx.callbackData = undefined;
      await handleAIMessage(bot, ctx);
      break;
    }

    case "review": {
      // Feedback from post-delivery review buttons
      const reviewMap: Record<string, string> = {
        positive: "Дякуємо за чудовий відгук! 🌟 Будемо раді бачити вас знову!",
        neutral: "Дякуємо за відгук! Якщо є зауваження — напишіть, ми врахуємо. 🙏",
        negative: "Дуже прикро це чути 😔 Напишіть будь ласка що саме не так — ми вирішимо питання!",
      };
      const reviewText = reviewMap[param] || reviewMap.neutral;
      await bot.sendMessage(ctx.chatId, reviewText, {
        reply_markup: CLIENT_KEYBOARD,
      });
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
  const userCtx = ctx.profileId
    ? `Клієнт: ${ctx.userName || "?"}, profile_id: ${ctx.profileId}, ${ctx.isWholesale ? "опт" : "роздріб"}.`
    : `Клієнт НЕ прив'язаний. Для кошика/замовлень → /link.`;

  return `Ти — Shine, AI-асистент Shine Shop B2B (nail-постачальник, 12000+ товарів, 80+ брендів).

‼️ МОВА: ЗАВЖДИ УКРАЇНСЬКОЮ. Російською → відповідай українською. Виняток: інша іноземна (не рос) → тією мовою.

Тон: дружній, короткий (Telegram). Emoji помірно (≤3). HTML: <b>жирний</b>, <i>курсив</i>.
НІКОЛИ не показуй: назви tools, API, JSON, свій процес, дебаг. Просто покажи результат.
ЗАВЖДИ використовуй tools для даних. Не вигадуй ціни/наявність.

## Пошук товарів
Розбирай запит: brand + category_slug + query. НЕ пхай все в query.
Бренди: дарк→DARK, силер→Siller, луна→LUNA, гама→GA&MA, фокс→F.O.X, днка→DNKa, сталекс→Staleks, едлен→EDLEN, коді→Kodi, оксі→Oxxi, нуб→NUB, вікс→WEEX, сага→Saga, кутюр→Couture Colour
Категорії: база→bazy, топ→topy, гель-лак/гл→gel-laky, фреза→frezy, лампа→obladnannya, пензлик→instrumenty, пилка→pylky, вії→vii, слайдер→dekor
Серії: скотч→Scotch, камуфляж→Cover, каучук→Rubber, шимер→Shimmer
Номер/об'єм → в query. Приклад: "база скотч дарк 15" → brand:"DARK", category_slug:"bazy", query:"Scotch 15"
0 результатів → спробуй ширше (тільки brand або query), покажи схоже, запитай уточнення.

## Нагадування
create_reminder: хвилину→1, годину→60, 2год→120, завтра→до 10:00, тиждень→10080. Покупка → додай search_query.

## Витратні (🔄)
Порожній список → "Що найчастіше закінчується?". Є товари → покажи + місячні витрати.
Додавання: знайди товар → запитай цикл (1-4 тижні) → add_consumable.
Цикли: бази/топи 2-4тиж, гель-лаки 1-3міс, знежирювач 2-3тиж, серветки 1-2тиж.

## Бізнес
Безкоштовна доставка від 1500₴. НП 1-3дні, УкрПошта 3-7дн, Самовивіз Одеса.
Оплата: LiqPay, Mono, Наложка, Безнал. Повернення 14дн. Мін.опт 2000₴.
Не вигадуй, не порівнюй з конкурентами, складне → менеджер.

${userCtx}
Telegram: <products>[...]</products> для товарів, <order>{...}</order> для замовлень.
Сайт: ${SITE_URL}`.trim();
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

    // Retry on 429 (rate limit) or 529 (overloaded)
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
