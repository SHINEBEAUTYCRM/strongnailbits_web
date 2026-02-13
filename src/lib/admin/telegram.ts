/**
 * Telegram Bot API utility — sends messages via the Admin Bot
 */

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: {
    parse_mode?: "HTML" | "MarkdownV2";
    reply_markup?: object;
  },
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;

  if (!token) {
    console.error("[Telegram] TELEGRAM_ADMIN_BOT_TOKEN is not set!");
    return { ok: false, error: "Bot token not configured" };
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };

    if (options?.parse_mode) body.parse_mode = options.parse_mode;
    if (options?.reply_markup) body.reply_markup = options.reply_markup;

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("[Telegram] API error:", data.description);
      return { ok: false, error: data.description };
    }

    return { ok: true };
  } catch (error) {
    console.error("[Telegram] Fetch error:", error);
    return { ok: false, error: String(error) };
  }
}
