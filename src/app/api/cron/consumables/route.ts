// ================================================================
//  Cron: перевірка витратних матеріалів (щодня о 09:00)
//  Знаходить consumables де час нагадати і відправляє фото/текст
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
  let processed = 0;

  // Find consumables where it's time to remind
  const { data: items } = await supabase
    .from("consumables")
    .select("*, product:products(price, quantity, main_image_url, slug)")
    .eq("is_active", true)
    .lte("next_remind_at", new Date().toISOString())
    .limit(50);

  for (const item of items || []) {
    try {
      const product = item.product as Record<string, unknown> | null;
      const inStock = ((product?.quantity as number) || 0) > 0;
      const price = (product?.price as number) || item.product_price;

      let text = `🔔 Час замовити:\n\n`;
      text += `<b>${item.product_name}</b>\n`;
      text += `💰 ${price}₴\n`;
      text += inStock ? `✅ В наявності` : `❌ Немає в наявності`;

      const buttons: Record<string, unknown>[][] = [];

      if (inStock) {
        buttons.push([
          {
            text: "🛒 Замовити",
            callback_data: `add_cart:${item.product_id}`,
          },
        ]);
      } else {
        buttons.push([
          {
            text: "🔔 Повідомити коли буде",
            callback_data: `notify_stock:${item.product_id}`,
          },
        ]);
      }

      buttons.push([
        {
          text: "⏰ Нагадай завтра",
          callback_data: `consumable_action:remind_tomorrow:${item.id}`,
        },
        {
          text: "⏭️ Пропустити",
          callback_data: `consumable_action:skip_once:${item.id}`,
        },
      ]);

      // Send photo if available
      const imageUrl = product?.main_image_url as string | null;
      if (imageUrl && !imageUrl.includes("placeholder")) {
        try {
          await fetch(`${baseUrl}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: item.telegram_id,
              photo: imageUrl,
              caption: text,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: buttons },
            }),
          });
        } catch (err) {
          console.error('[API:Cron:Consumables] Photo send failed:', err);
          await fetch(`${baseUrl}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: item.telegram_id,
              text,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: buttons },
            }),
          });
        }
      } else {
        await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: item.telegram_id,
            text,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons },
          }),
        });
      }

      // Advance next_remind_at by one cycle
      const nextRemind = new Date(
        Date.now() + (item.cycle_days as number) * 24 * 60 * 60 * 1000,
      );
      await supabase
        .from("consumables")
        .update({
          next_remind_at: nextRemind.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      processed++;
    } catch (err) {
      console.error(`Failed to process consumable ${item.id}:`, err);
    }
  }

  return NextResponse.json({ processed });
}
