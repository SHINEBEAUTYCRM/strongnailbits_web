/**
 * AI-powered Funnel Intelligence
 *
 * Uses Claude to:
 * 1. Personalize messages based on customer profile
 * 2. Score leads for conversion probability
 * 3. Analyze funnel performance and suggest improvements
 * 4. Generate message templates for new stages
 */

import { askClaude, chatWithClaude, isAIConfigured, type ClaudeMessage } from "./claude";
import { createAdminClient } from "@/lib/supabase/admin";

// ────── System Prompts ──────

const SYSTEM_PERSONALIZE = `Ти — AI-маркетолог B2B косметичного бренду ShineShop (нігтьова косметика: гель-лаки, фрези, лампи, декор).
Цільова аудиторія: майстри манікюру, салони краси, косметологи в Україні.

Твоя задача — персоналізувати повідомлення для конкретного клієнта.

Правила:
- Пиши УКРАЇНСЬКОЮ мовою
- Стиль: дружній, професійний, B2B (не надто емоційний)
- Використовуй ім'я клієнта
- Враховуй історію покупок, суму замовлень, давність
- Не більше 300 символів для Telegram / 160 для SMS
- Додай 1 релевантний емодзі
- Фокус на вигоді клієнта (знижка, новинки, бонуси)
- Завжди закінчуй заклик до дії (CTA)`;

const SYSTEM_SCORING = `Ти — AI-аналітик B2B продажів для ShineShop (оптова косметика для нігтів).

Оціни ймовірність конверсії контакту від 0 до 100 на основі його даних.

Фактори:
- Кількість замовлень і сума → лояльність
- Давність останнього замовлення → активність
- Тип клієнта (salon/master/retail) → потенціал
- Наявність компанії → B2B-потенціал
- Етап воронки → прогрес
- Чи підключений Telegram → engagement

Відповідай ТІЛЬКИ JSON:
{"score": число, "label": "hot"|"warm"|"cold"|"lost", "reason": "короткий коментар"}`;

const SYSTEM_ADVISOR = `Ти — AI-радник SmartЛійки для ShineShop B2B (оптова косметика для нігтів).

Ти допомагаєш адміну:
- Аналізувати ефективність воронок
- Знаходити вузькі місця (де втрачаються контакти)
- Пропонувати покращення повідомлень
- Генерувати нові шаблони
- Рекомендувати стратегії реактивації

Відповідай УКРАЇНСЬКОЮ. Будь конкретним — з цифрами, прикладами, кроками.
Формат: використовуй емодзі для візуальних маркерів, структуруй відповідь.`;

const SYSTEM_CHATBOT = `Ти — досвідчений консультант інтернет-магазину ShineShop B2B в Telegram.

КОНТЕКСТ МАГАЗИНУ:
ShineShop B2B — оптовий магазин професійної косметики для нігтів в Україні.
Асортимент: гель-лаки (кольорові, котяче око, термо), бази (rubber base, dark base, camouflage base, French base), топи (глянцевий, матовий, без липкого шару), фрези (твердосплавні, алмазні, корундові, силіконові), лампи UV/LED, декор (стрази, фольга, глітер, слайдери), рідини (знежирювач, праймер, ремувер), інструменти (пушери, кусачки, пилки).
Клієнти — майстри манікюру, салони краси, навчальні центри.

ЯК ВІДПОВІДАТИ:
- Мова: ТІЛЬКИ українська
- Стиль: як живий продавець-консультант — дружньо, впевнено, по суті
- Довжина: 1-4 речення. Якщо питання складне — до 6 речень максимум
- НІКОЛИ не починай з "Привіт", "Вітаю", "Доброго дня" — одразу відповідай на питання
- Використовуй 0-1 емодзі на повідомлення, не більше
- Якщо клієнт питає про конкретний товар — дай корисну пораду + скажи перевірити наявність на сайті
- НІКОЛИ не вигадуй ціни, артикули чи точну наявність — кажи "перевірте на сайті" або "уточніть у менеджера"
- Якщо клієнт питає щось не по темі — ввічливо поверни до теми манікюру/продукції
- Якщо можеш порекомендувати категорію товарів — роби це
- Сайт: shineshopb2b.com`;

// ────── 1. Message Personalization ──────

interface PersonalizeInput {
  template: string;
  customerName: string;
  customerPhone?: string;
  company?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDays?: number;
  loyaltyTier?: string;
  funnelStage?: string;
  channel: "telegram" | "sms";
}

/**
 * AI-personalize a funnel message for a specific customer.
 * Falls back to original template if AI is unavailable.
 */
export async function personalizeMessage(
  input: PersonalizeInput,
): Promise<string> {
  if (!(await isAIConfigured())) {
    return input.template;
  }

  try {
    const maxLen = input.channel === "sms" ? 160 : 300;

    const prompt = `Персоналізуй це повідомлення для клієнта:

ШАБЛОН:
${input.template}

КЛІЄНТ:
- Ім'я: ${input.customerName}
- Компанія: ${input.company || "не вказано"}
- Замовлень: ${input.totalOrders ?? "невідомо"}
- Загалом витратив: ${input.totalSpent ? `${input.totalSpent} грн` : "невідомо"}
- Днів з останнього замовлення: ${input.lastOrderDays ?? "невідомо"}
- Рівень лояльності: ${input.loyaltyTier || "новий"}
- Етап воронки: ${input.funnelStage || "невідомо"}

КАНАЛ: ${input.channel} (макс ${maxLen} символів)

Поверни ТІЛЬКИ текст повідомлення, без пояснень.`;

    const result = await askClaude(prompt, {
      system: SYSTEM_PERSONALIZE,
      maxTokens: 300,
      fast: true, // Use Haiku for speed
      temperature: 0.7,
    });

    // Validate: if AI response is reasonable, use it; otherwise fallback
    if (result && result.length > 10 && result.length < maxLen * 2) {
      return result.trim();
    }

    return input.template;
  } catch {
    return input.template;
  }
}

// ────── 2. Lead Scoring ──────

interface LeadData {
  name?: string;
  company?: string;
  type?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDays?: number;
  funnelStage?: string;
  hasTelegram?: boolean;
  registeredDays?: number;
}

interface LeadScore {
  score: number;
  label: "hot" | "warm" | "cold" | "lost";
  reason: string;
}

/**
 * AI-powered lead scoring for a funnel contact.
 */
export async function scoreContact(data: LeadData): Promise<LeadScore> {
  // Default rule-based scoring if AI unavailable
  if (!(await isAIConfigured())) {
    return ruleBasedScore(data);
  }

  try {
    const prompt = `Оціни контакт:
${JSON.stringify(data, null, 2)}`;

    const result = await askClaude(prompt, {
      system: SYSTEM_SCORING,
      maxTokens: 200,
      fast: true,
      temperature: 0,
    });

    // Parse JSON response
    const match = result.match(/\{[^}]+\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as LeadScore;
      if (
        typeof parsed.score === "number" &&
        parsed.label &&
        parsed.reason
      ) {
        return parsed;
      }
    }

    return ruleBasedScore(data);
  } catch {
    return ruleBasedScore(data);
  }
}

/** Fallback rule-based scoring */
function ruleBasedScore(data: LeadData): LeadScore {
  let score = 30; // base

  if (data.totalOrders && data.totalOrders > 0) score += 20;
  if (data.totalOrders && data.totalOrders > 5) score += 15;
  if (data.totalSpent && data.totalSpent > 5000) score += 10;
  if (data.totalSpent && data.totalSpent > 20000) score += 10;
  if (data.company) score += 5;
  if (data.hasTelegram) score += 5;
  if (data.type === "salon") score += 5;

  // Penalty for inactivity
  if (data.lastOrderDays && data.lastOrderDays > 60) score -= 15;
  if (data.lastOrderDays && data.lastOrderDays > 120) score -= 15;

  score = Math.max(0, Math.min(100, score));

  const label: LeadScore["label"] =
    score >= 70 ? "hot" : score >= 40 ? "warm" : score >= 20 ? "cold" : "lost";

  return { score, label, reason: "Rule-based scoring (AI not configured)" };
}

// ────── 3. Funnel Advisor ──────

/**
 * AI Advisor for admin — analyze funnel and provide recommendations.
 */
export async function adviseFunnel(
  question: string,
  context: {
    funnelData?: string;
    previousMessages?: ClaudeMessage[];
  },
): Promise<string> {
  if (!(await isAIConfigured())) {
    return "❌ Claude AI не налаштовано. Додайте API ключ в Адмінка → Інтеграції → Claude API.";
  }

  try {
    // Build context prompt
    let contextPrompt = "";
    if (context.funnelData) {
      contextPrompt = `\n\nДані воронок:\n${context.funnelData}\n\n`;
    }

    const messages: ClaudeMessage[] = [
      ...(context.previousMessages || []),
      {
        role: "user",
        content: contextPrompt + question,
      },
    ];

    const response = await chatWithClaude(messages, {
      system: SYSTEM_ADVISOR,
      maxTokens: 2048,
    });

    return response.text || "Не вдалося отримати відповідь від AI.";
  } catch (err) {
    console.error("[FunnelAI] Advisor error:", err);
    return "❌ Помилка AI. Спробуйте пізніше.";
  }
}

/**
 * Generate message template for a funnel stage using AI.
 */
export async function generateTemplate(params: {
  funnelName: string;
  stageName: string;
  stageDescription?: string;
  channel: "telegram" | "sms";
  tone?: string;
}): Promise<string> {
  if (!(await isAIConfigured())) {
    return "";
  }

  const maxLen = params.channel === "sms" ? 160 : 500;

  const prompt = `Створи шаблон повідомлення для етапу воронки:

Воронка: ${params.funnelName}
Етап: ${params.stageName}
${params.stageDescription ? `Опис: ${params.stageDescription}` : ""}
Канал: ${params.channel} (макс ${maxLen} символів)
Тон: ${params.tone || "дружній, B2B"}

Використовуй змінні: {{name}}, {{company}}, {{order_number}}, {{order_total}}, {{site_url}}

Поверни ТІЛЬКИ текст шаблону.`;

  return askClaude(prompt, {
    system: SYSTEM_PERSONALIZE,
    maxTokens: 400,
    fast: true,
    temperature: 0.8,
  });
}

// ────── 4. Smart Chat-Bot ──────

/**
 * AI-powered response to a client's Telegram message.
 * Enriches context with their profile and recent orders.
 */
export async function smartBotReply(
  userMessage: string,
  chatId: number,
): Promise<string | null> {
  const configured = await isAIConfigured();
  console.log("[SmartBot] isAIConfigured:", configured, "chatId:", chatId);

  if (!configured) {
    return null; // AI not available, let the bot handle it with fallback
  }

  try {
    const supabase = createAdminClient();

    // Get customer profile (include id for orders lookup)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, company, type, discount_percent, total_orders, total_spent",
      )
      .eq("telegram_chat_id", chatId)
      .maybeSingle(); // Use maybeSingle to avoid throwing on no results

    console.log("[SmartBot] Profile found:", !!profile, "error:", profileError?.message);

    // Get recent orders
    let ordersContext = "";
    if (profile?.id) {
      const { data: orders } = await supabase
        .from("orders")
        .select("order_number, status, total, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (orders && orders.length > 0) {
        ordersContext = `\nОстанні замовлення: ${orders.map((o) => `#${o.order_number} (${o.status}, ${o.total} грн)`).join(", ")}`;
      }
    }

    // Build context
    const customerContext = profile
      ? `Клієнт: ${profile.first_name || ""} ${profile.last_name || ""}, компанія: ${profile.company || "не вказано"}, тип: ${profile.type || "retail"}, знижка: ${profile.discount_percent || 0}%, замовлень: ${profile.total_orders || 0}, витрачено: ${profile.total_spent || 0} грн${ordersContext}`
      : "Клієнт не ідентифікований (Telegram не привʼязано до акаунту)";

    const prompt = `Контекст клієнта:
${customerContext}

Повідомлення клієнта:
${userMessage}`;

    console.log("[SmartBot] Calling Claude with context length:", customerContext.length);

    const result = await askClaude(prompt, {
      system: SYSTEM_CHATBOT,
      maxTokens: 500,
      fast: true, // Haiku for fast responses
      temperature: 0.5,
    });

    console.log("[SmartBot] Claude result:", result ? `${result.length} chars` : "empty");

    if (result && result.length > 5) {
      return result.trim();
    }

    return null;
  } catch (err) {
    console.error("[SmartBot] Error:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ────── 5. Bulk Scoring ──────

/**
 * Score all contacts in a funnel (batch).
 * Returns array of {contactId, score, label, reason}
 */
export async function scoreFunnelContacts(
  funnelId: string,
): Promise<{ contactId: string; score: number; label: string; reason: string }[]> {
  const supabase = createAdminClient();

  const { data: contacts } = await supabase
    .from("funnel_contacts")
    .select(`
      id,
      name,
      phone,
      stage_id,
      entered_stage_at,
      profiles (
        company,
        type,
        total_orders,
        total_spent,
        telegram_chat_id,
        created_at
      ),
      funnel_stages (
        name,
        position
      )
    `)
    .eq("funnel_id", funnelId)
    .eq("is_active", true)
    .limit(100);

  if (!contacts || contacts.length === 0) return [];

  const results = [];

  for (const contact of contacts) {
    const profile = contact.profiles as unknown as {
      company?: string;
      type?: string;
      total_orders?: number;
      total_spent?: number;
      telegram_chat_id?: number;
      created_at?: string;
    } | null;

    const stage = contact.funnel_stages as unknown as {
      name: string;
      position: number;
    } | null;

    const lastOrderDays = profile?.total_orders
      ? Math.floor(
          (Date.now() - new Date(contact.entered_stage_at).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : undefined;

    const score = await scoreContact({
      name: contact.name || undefined,
      company: profile?.company,
      type: profile?.type,
      totalOrders: profile?.total_orders,
      totalSpent: profile?.total_spent,
      lastOrderDays,
      funnelStage: stage?.name,
      hasTelegram: !!profile?.telegram_chat_id,
      registeredDays: profile?.created_at
        ? Math.floor(
            (Date.now() - new Date(profile.created_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : undefined,
    });

    results.push({
      contactId: contact.id,
      ...score,
    });
  }

  return results;
}

// ────── 6. Funnel Analysis Summary ──────

/**
 * Generate an AI-powered analysis of all funnels.
 */
export async function analyzeFunnels(): Promise<string> {
  if (!(await isAIConfigured())) {
    return "Claude AI не налаштовано.";
  }

  try {
    const supabase = createAdminClient();

    // Get all funnels with stats
    const { data: funnels } = await supabase
      .from("funnels")
      .select("name, slug, is_active")
      .eq("is_active", true);

    if (!funnels || funnels.length === 0) {
      return "Немає активних воронок для аналізу.";
    }

    const funnelStats = [];

    for (const funnel of funnels) {
      const { data: stages } = await supabase
        .from("funnel_stages")
        .select("name, position")
        .eq("funnel_id", funnel.slug) // needs actual id
        .order("position");

      const { count: totalContacts } = await supabase
        .from("funnel_contacts")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      funnelStats.push({
        name: funnel.name,
        stages: stages?.length || 0,
        contacts: totalContacts || 0,
      });
    }

    const dataStr = JSON.stringify(funnelStats, null, 2);

    return adviseFunnel(
      "Проаналізуй ці воронки і дай 3-5 конкретних рекомендацій для покращення конверсії:",
      { funnelData: dataStr },
    );
  } catch (err) {
    console.error("[FunnelAI] Analysis error:", err);
    return "Помилка аналізу воронок.";
  }
}
