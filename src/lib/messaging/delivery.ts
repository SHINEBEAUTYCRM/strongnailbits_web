/**
 * Multi-channel Message Delivery Engine
 *
 * Sends messages to clients via Telegram (free) or SMS (paid).
 * Channel logic:
 *   auto     → Telegram if available, else SMS
 *   telegram → Telegram only (skip if no chat_id)
 *   sms      → SMS only
 *   both     → Telegram + SMS
 */

import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com";

// ────── Types ──────

export interface TemplateVariables {
  name?: string;
  phone?: string;
  company?: string;
  email?: string;
  order_number?: string;
  order_total?: string;
  bonus_balance?: string;
  days_since_last_order?: string;
  site_url?: string;
  [key: string]: string | undefined;
}

interface DeliveryTarget {
  profileId?: string;
  phone?: string;
  telegramChatId?: number | null;
  notificationChannel?: string;
}

interface DeliveryResult {
  channel: "telegram" | "sms";
  success: boolean;
  externalId?: string;
  error?: string;
  cost?: number;
}

interface SendOptions {
  target: DeliveryTarget;
  template: string;
  variables: TemplateVariables;
  channel?: "auto" | "telegram" | "sms" | "both";
  /** JSON inline keyboard buttons for Telegram (rendered with {{variables}}) */
  buttonsJson?: string | null;
  /** Photo URL for Telegram (rendered with {{variables}}) */
  photoUrl?: string | null;
  /** For logging */
  funnelContactId?: string;
  funnelMessageId?: string;
}

// ────── Template Rendering ──────

/** Render a template with {{variables}} */
export function renderTemplate(
  template: string,
  variables: TemplateVariables,
): string {
  let text = template;

  // Always inject site_url
  const vars = { site_url: SITE_URL, ...variables };

  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
  }

  // Remove remaining unresolved variables
  text = text.replace(/\{\{[^}]+\}\}/g, "");

  return text.trim();
}

// ────── Delivery ──────

/**
 * Send a message to a client through the best available channel.
 * If AI is configured, personalizes the message using Claude.
 * Returns delivery results (may be multiple for "both" channel).
 */
export async function deliverMessage(
  options: SendOptions,
): Promise<DeliveryResult[]> {
  const { target, template, variables, channel = "auto" } = options;
  let renderedText = renderTemplate(template, variables);

  // Try AI personalization (non-blocking, fallback to template)
  try {
    const { personalizeMessage } = await import("@/lib/ai/funnel-ai");
    const effectiveCh = resolveChannel(channel, target);
    const aiChannel = effectiveCh === "both" || effectiveCh === "telegram" ? "telegram" : "sms";
    const personalized = await personalizeMessage({
      template: renderedText,
      customerName: variables.name || "Клієнте",
      customerPhone: variables.phone,
      company: variables.company,
      channel: aiChannel as "telegram" | "sms",
    });
    if (personalized && personalized.length > 10) {
      renderedText = personalized;
    }
  } catch {
    // AI not available — use rendered template as-is
  }

  const results: DeliveryResult[] = [];

  // Resolve effective channel
  const effectiveChannel = resolveChannel(channel, target);

  // Render buttons if provided
  let renderedButtons: InlineButton[][] | undefined;
  if (options.buttonsJson) {
    try {
      const raw = renderTemplate(options.buttonsJson, variables);
      renderedButtons = JSON.parse(raw) as InlineButton[][];
    } catch {
      // Invalid buttons JSON — skip
    }
  }

  // Render photo URL if provided
  const renderedPhoto = options.photoUrl
    ? renderTemplate(options.photoUrl, variables)
    : undefined;

  // Send via Telegram
  if (
    effectiveChannel === "telegram" ||
    effectiveChannel === "both"
  ) {
    const chatId = target.telegramChatId;
    if (chatId) {
      const result = await sendTelegram(chatId, renderedText, {
        buttons: renderedButtons,
        photoUrl: renderedPhoto,
      });
      results.push(result);
      await logDelivery({
        ...options,
        renderedText,
        result,
        telegramChatId: chatId,
      });
    }
  }

  // Send via SMS
  if (
    effectiveChannel === "sms" ||
    effectiveChannel === "both" ||
    (effectiveChannel === "auto-sms")
  ) {
    const phone = target.phone;
    if (phone) {
      const result = await sendSmsMessage(phone, renderedText);
      results.push(result);
      await logDelivery({
        ...options,
        renderedText,
        result,
        phone,
      });
    }
  }

  return results;
}

/** Resolve the actual delivery channel based on availability */
function resolveChannel(
  requested: string,
  target: DeliveryTarget,
): "telegram" | "sms" | "both" | "auto-sms" {
  const hasTelegram = !!target.telegramChatId;
  const preferredChannel = target.notificationChannel || "auto";

  // If target has explicit preference, honor it (unless we can't)
  if (preferredChannel === "telegram" && hasTelegram) return "telegram";
  if (preferredChannel === "sms") return "sms";
  if (preferredChannel === "both" && hasTelegram) return "both";
  if (preferredChannel === "both" && !hasTelegram) return "sms";

  // Requested channel logic
  if (requested === "both" && hasTelegram) return "both";
  if (requested === "both" && !hasTelegram) return "sms";
  if (requested === "telegram") return hasTelegram ? "telegram" : "sms";
  if (requested === "sms") return "sms";

  // Auto: Telegram first (free), SMS fallback (paid)
  return hasTelegram ? "telegram" : "auto-sms";
}

// ────── Types for Rich Telegram ──────

interface InlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

interface TelegramSendOptions {
  buttons?: InlineButton[][];
  photoUrl?: string;
}

// ────── Telegram ──────

async function sendTelegram(
  chatId: number,
  text: string,
  options?: TelegramSendOptions,
): Promise<DeliveryResult> {
  try {
    const botToken = await getBotToken();
    if (!botToken) {
      return { channel: "telegram", success: false, error: "Bot not configured" };
    }

    const baseUrl = `https://api.telegram.org/bot${botToken}`;

    // Build reply_markup with inline keyboard buttons
    const replyMarkup = options?.buttons?.length
      ? { inline_keyboard: options.buttons }
      : undefined;

    // If photo URL is provided, send as photo with caption
    if (options?.photoUrl && !options.photoUrl.includes("placeholder")) {
      try {
        const photoRes = await fetch(`${baseUrl}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: options.photoUrl,
            caption: text.slice(0, 1024), // Telegram caption limit
            parse_mode: "HTML",
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          }),
          signal: AbortSignal.timeout(15000),
        });

        const photoData = await photoRes.json();

        if (photoData.ok) {
          return {
            channel: "telegram",
            success: true,
            externalId: String(photoData.result?.message_id),
          };
        }
        // Photo failed, fall through to text message
      } catch {
        // Photo failed, fall through to text message
      }
    }

    // Send text message with HTML formatting
    const res = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();

    if (!data.ok) {
      // If HTML parse fails, retry without parse_mode
      if (data.description?.includes("can't parse")) {
        const retryRes = await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            disable_web_page_preview: true,
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          }),
          signal: AbortSignal.timeout(10000),
        });
        const retryData = await retryRes.json();
        if (retryData.ok) {
          return {
            channel: "telegram",
            success: true,
            externalId: String(retryData.result?.message_id),
          };
        }
      }

      // If user blocked the bot, don't retry
      if (data.description?.includes("bot was blocked")) {
        return {
          channel: "telegram",
          success: false,
          error: "Bot blocked by user",
        };
      }
      return {
        channel: "telegram",
        success: false,
        error: data.description || "Telegram API error",
      };
    }

    return {
      channel: "telegram",
      success: true,
      externalId: String(data.result?.message_id),
    };
  } catch (err) {
    return {
      channel: "telegram",
      success: false,
      error: err instanceof Error ? err.message : "Telegram send failed",
    };
  }
}

// ────── SMS ──────

async function sendSmsMessage(
  phone: string,
  text: string,
): Promise<DeliveryResult> {
  try {
    const { sendSms } = await import("@/lib/sms/alphasms");
    const result = await sendSms(phone, text);

    return {
      channel: "sms",
      success: result.success,
      externalId: result.messageId ? String(result.messageId) : undefined,
      error: result.error,
      cost: result.success ? 0.5 : 0, // Approximate cost per SMS
    };
  } catch (err) {
    return {
      channel: "sms",
      success: false,
      error: err instanceof Error ? err.message : "SMS send failed",
    };
  }
}

// ────── Bot Token Cache ──────

let _botToken: string | null = null;
let _botTokenTime = 0;

async function getBotToken(): Promise<string | null> {
  if (_botToken && Date.now() - _botTokenTime < 5 * 60 * 1000) {
    return _botToken;
  }

  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken) {
    _botToken = envToken;
    _botTokenTime = Date.now();
    return _botToken;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("integration_keys")
      .select("config")
      .eq("slug", "telegram-bot")
      .eq("is_active", true)
      .single();

    if (data?.config) {
      const config =
        typeof data.config === "string" ? JSON.parse(data.config) : data.config;
      if (config.bot_token) {
        _botToken = config.bot_token;
        _botTokenTime = Date.now();
        return _botToken;
      }
    }
  } catch {
    // silent
  }

  return null;
}

// ────── Delivery Logging ──────

async function logDelivery(params: {
  target: DeliveryTarget;
  renderedText: string;
  result: DeliveryResult;
  funnelContactId?: string;
  funnelMessageId?: string;
  template: string;
  phone?: string;
  telegramChatId?: number;
}): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("message_log").insert({
      profile_id: params.target.profileId || null,
      funnel_contact_id: params.funnelContactId || null,
      funnel_message_id: params.funnelMessageId || null,
      channel: params.result.channel,
      phone: params.phone || params.target.phone || null,
      telegram_chat_id: params.telegramChatId || null,
      template: params.template,
      rendered_text: params.renderedText,
      status: params.result.success ? "sent" : "failed",
      error: params.result.error || null,
      cost: params.result.cost || 0,
      external_id: params.result.externalId || null,
    });
  } catch (err) {
    console.error("[Delivery] Failed to log:", err);
  }
}

// ────── Helpers ──────

/**
 * Resolve a client profile to delivery target.
 * Fetches telegram_chat_id, phone, notification_channel from DB.
 */
export async function resolveTarget(
  profileId?: string,
  phone?: string,
): Promise<DeliveryTarget> {
  const target: DeliveryTarget = { profileId, phone };

  if (profileId) {
    try {
      const supabase = createAdminClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, telegram_chat_id, telegram_username, notification_channel")
        .eq("id", profileId)
        .single();

      if (profile) {
        target.phone = profile.phone || phone;
        target.telegramChatId = profile.telegram_chat_id;
        target.notificationChannel = profile.notification_channel || "auto";
      }
    } catch {
      // silent
    }
  }

  return target;
}

/**
 * Build template variables from a profile and optional metadata.
 */
export async function buildVariables(
  profileId?: string,
  metadata?: Record<string, unknown>,
): Promise<TemplateVariables> {
  const vars: TemplateVariables = { site_url: SITE_URL };

  if (profileId) {
    try {
      const supabase = createAdminClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, company, email")
        .eq("id", profileId)
        .single();

      if (profile) {
        vars.name = [profile.first_name, profile.last_name]
          .filter(Boolean)
          .join(" ") || "Клієнте";
        vars.phone = profile.phone || undefined;
        vars.company = profile.company || undefined;
        vars.email = profile.email || undefined;
      }
    } catch {
      // silent
    }
  }

  // Merge metadata
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        vars[key] = String(value);
      }
    }
  }

  return vars;
}
