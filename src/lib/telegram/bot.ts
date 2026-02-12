/**
 * Telegram Bot API Client — ShineShop
 *
 * Full-featured wrapper for Telegram Bot API.
 * Supports: messages, photos, media groups, callbacks, chat actions, webhooks.
 */

const TELEGRAM_API = "https://api.telegram.org/bot";
const REQUEST_TIMEOUT = 15_000;

// ────── Types ──────

export interface TgSendMessageOptions {
  reply_markup?: Record<string, unknown>;
  parse_mode?: "HTML" | "MarkdownV2";
  disable_web_page_preview?: boolean;
}

export interface TgSendPhotoOptions {
  caption?: string;
  reply_markup?: Record<string, unknown>;
  parse_mode?: "HTML" | "MarkdownV2";
}

export interface TgMediaItem {
  type: "photo";
  media: string;
  caption?: string;
  parse_mode?: "HTML" | "MarkdownV2";
}

interface TgApiResult {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
}

// ────── TelegramBot Class ──────

export class TelegramBot {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = `${TELEGRAM_API}${token}`;
  }

  /** Send a text message */
  async sendMessage(
    chatId: number,
    text: string,
    options?: TgSendMessageOptions,
  ): Promise<TgApiResult> {
    // Telegram limit: 4096 chars. Split if needed.
    if (text.length > 4096) {
      const chunks = splitText(text, 4096);
      let lastResult: TgApiResult = { ok: false };
      for (let i = 0; i < chunks.length; i++) {
        lastResult = await this.request("sendMessage", {
          chat_id: chatId,
          text: chunks[i],
          parse_mode: options?.parse_mode || "HTML",
          disable_web_page_preview: options?.disable_web_page_preview ?? true,
          // Only add reply_markup to the last chunk
          ...(i === chunks.length - 1 && options?.reply_markup
            ? { reply_markup: options.reply_markup }
            : {}),
        });
      }
      return lastResult;
    }

    return this.request("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || "HTML",
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
      ...(options?.reply_markup ? { reply_markup: options.reply_markup } : {}),
    });
  }

  /** Send a photo with optional caption and buttons */
  async sendPhoto(
    chatId: number,
    photo: string,
    options?: TgSendPhotoOptions,
  ): Promise<TgApiResult> {
    return this.request("sendPhoto", {
      chat_id: chatId,
      photo,
      caption: options?.caption,
      parse_mode: options?.parse_mode || "HTML",
      ...(options?.reply_markup ? { reply_markup: options.reply_markup } : {}),
    });
  }

  /** Send multiple photos as a media group (album) */
  async sendMediaGroup(
    chatId: number,
    media: TgMediaItem[],
  ): Promise<TgApiResult> {
    return this.request("sendMediaGroup", {
      chat_id: chatId,
      media,
    });
  }

  /** Show "typing..." or "uploading photo..." indicator */
  async sendChatAction(
    chatId: number,
    action: "typing" | "upload_photo" | "upload_document",
  ): Promise<TgApiResult> {
    return this.request("sendChatAction", {
      chat_id: chatId,
      action,
    });
  }

  /** Answer a callback query (removes loading spinner on inline button) */
  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
  ): Promise<TgApiResult> {
    return this.request("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
    });
  }

  /** Delete a message */
  async deleteMessage(
    chatId: number,
    messageId: number,
  ): Promise<TgApiResult> {
    return this.request("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    });
  }

  /** Edit an existing message text */
  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    options?: TgSendMessageOptions,
  ): Promise<TgApiResult> {
    return this.request("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options?.parse_mode || "HTML",
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
      ...(options?.reply_markup ? { reply_markup: options.reply_markup } : {}),
    });
  }

  /** Register webhook URL with Telegram */
  async setWebhook(url: string, secretToken?: string): Promise<TgApiResult> {
    return this.request("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
    });
  }

  /** Delete webhook (switch back to polling) */
  async deleteWebhook(): Promise<TgApiResult> {
    return this.request("deleteWebhook", {});
  }

  /** Get current webhook info */
  async getWebhookInfo(): Promise<TgApiResult> {
    return this.request("getWebhookInfo", {});
  }

  /** Set bot commands (hamburger menu) */
  async setMyCommands(
    commands: { command: string; description: string }[],
    scope?: Record<string, unknown>,
  ): Promise<TgApiResult> {
    return this.request("setMyCommands", {
      commands,
      ...(scope ? { scope } : {}),
    });
  }

  /** Set bot short description */
  async setMyShortDescription(
    shortDescription: string,
  ): Promise<TgApiResult> {
    return this.request("setMyShortDescription", {
      short_description: shortDescription,
    });
  }

  /** Set bot description (shown before /start) */
  async setMyDescription(description: string): Promise<TgApiResult> {
    return this.request("setMyDescription", { description });
  }

  /** Set chat menu button */
  async setChatMenuButton(
    menuButton: Record<string, unknown>,
  ): Promise<TgApiResult> {
    return this.request("setChatMenuButton", { menu_button: menuButton });
  }

  /** Generic Telegram API request */
  private async request(
    method: string,
    body: Record<string, unknown>,
  ): Promise<TgApiResult> {
    try {
      const res = await fetch(`${this.baseUrl}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      const data: TgApiResult = await res.json();

      if (!data.ok) {
        console.error(`[TgBot] ${method} failed:`, data.description);
      }

      return data;
    } catch (err) {
      console.error(`[TgBot] ${method} error:`, err);
      return {
        ok: false,
        description: err instanceof Error ? err.message : "Request failed",
      };
    }
  }
}

// ────── Singleton bot instance ──────

let _botInstance: TelegramBot | null = null;

/** Get or create the singleton TelegramBot instance */
export function getBot(): TelegramBot {
  if (_botInstance) return _botInstance;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured");

  _botInstance = new TelegramBot(token);
  return _botInstance;
}

// ────── Helpers ──────

/** Escape HTML special chars for Telegram HTML parse mode */
export function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ────── Legacy API (backward compatibility with old notify.ts) ──────

/** Check if Telegram is configured (non-throwing) — LEGACY */
export async function isTelegramConfigured(): Promise<boolean> {
  return !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID;
}

interface LegacySendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Send a message to the admin chat ID (from env).
 * LEGACY — used by old notify.ts. New code should use TelegramBot class.
 */
export async function sendMessage(
  text: string,
  options?: { parseMode?: "HTML" | "MarkdownV2"; disablePreview?: boolean },
): Promise<LegacySendResult> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return { success: false, error: "Telegram not configured" };
    }

    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || "HTML",
        disable_web_page_preview: options?.disablePreview ?? true,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("[Telegram] Legacy API error:", data.description);
      return { success: false, error: data.description };
    }
    return { success: true, messageId: data.result?.message_id };
  } catch (err) {
    console.error("[Telegram] Legacy send failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Send failed",
    };
  }
}

// ────── Text Utilities ──────

/** Split text into chunks, respecting newlines where possible */
function splitText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let splitPoint = remaining.lastIndexOf("\n", maxLength);
    if (splitPoint < maxLength / 2) {
      splitPoint = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitPoint < maxLength / 2) {
      splitPoint = maxLength;
    }
    chunks.push(remaining.slice(0, splitPoint));
    remaining = remaining.slice(splitPoint).trimStart();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
