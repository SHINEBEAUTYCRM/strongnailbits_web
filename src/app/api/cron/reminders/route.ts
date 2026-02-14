// ================================================================
//  Cron: перевірка нагадувань (кожні 15 хвилин або щогодини)
//  Знаходить нагадування час яких настав і відправляє в Telegram
// ================================================================

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/integrations/cron-runner";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServiceField } from "@/lib/integrations/config-resolver";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const botToken = await getServiceField('telegram-bot', 'bot_token');

  if (!botToken) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
  }

  const baseUrl = `https://api.telegram.org/bot${botToken}`;

  // Find all pending reminders whose time has come
  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("sent", false)
    .lte("remind_at", new Date().toISOString())
    .limit(50);

  if (error || !reminders?.length) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const reminder of reminders) {
    try {
      // Build inline keyboard
      const inlineKeyboard: Record<string, unknown>[][] = [];

      if (reminder.search_query) {
        inlineKeyboard.push([
          {
            text: "🔍 Знайти в каталозі",
            callback_data: `search_reminder:${String(reminder.search_query).slice(0, 50)}`,
          },
        ]);
      }

      inlineKeyboard.push([
        {
          text: "✅ Готово",
          callback_data: `dismiss_reminder:${reminder.id}`,
        },
      ]);

      // Send message
      await fetch(`${baseUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: reminder.telegram_id,
          text: `🔔 Нагадування:\n${reminder.message}`,
          reply_markup: { inline_keyboard: inlineKeyboard },
        }),
      });

      // Mark as sent
      await supabase
        .from("reminders")
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq("id", reminder.id);

      processed++;
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err);
    }
  }

  return NextResponse.json({ processed });
}
