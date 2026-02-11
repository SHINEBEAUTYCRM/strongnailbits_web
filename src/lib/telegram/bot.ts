/**
 * Telegram Bot API client for ShineShop notifications
 */

const TELEGRAM_API = "https://api.telegram.org/bot";

/** Cached config */
let _cachedConfig: { botToken: string; chatId: string } | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getConfig(): Promise<{ botToken: string; chatId: string }> {
  if (_cachedConfig && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedConfig;
  }

  // 1. ENV vars
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;

  if (envToken && envChatId) {
    _cachedConfig = { botToken: envToken, chatId: envChatId };
    _cacheTime = Date.now();
    return _cachedConfig;
  }

  // 2. DB fallback
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
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
      if (config.bot_token && config.chat_id) {
        _cachedConfig = {
          botToken: config.bot_token,
          chatId: config.chat_id,
        };
        _cacheTime = Date.now();
        return _cachedConfig;
      }
    }
  } catch {
    // fall through
  }

  throw new Error("Telegram bot not configured");
}

/** Check if Telegram is configured (non-throwing) */
export async function isTelegramConfigured(): Promise<boolean> {
  try {
    await getConfig();
    return true;
  } catch {
    return false;
  }
}

interface SendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/** Send a message via Telegram Bot API */
export async function sendMessage(
  text: string,
  options?: { parseMode?: "HTML" | "MarkdownV2"; disablePreview?: boolean },
): Promise<SendResult> {
  try {
    const { botToken, chatId } = await getConfig();

    const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || "HTML",
        disable_web_page_preview: options?.disablePreview ?? true,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();

    if (!data.ok) {
      console.error("[Telegram] API error:", data.description);
      return { success: false, error: data.description };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err) {
    console.error("[Telegram] Send failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Send failed",
    };
  }
}

/** Escape HTML special chars for Telegram */
export function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
