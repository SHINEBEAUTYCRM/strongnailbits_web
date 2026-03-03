import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STATUS_MSG: Record<string, { title: string; body: string }> = {
  processing: {
    title: 'Замовлення обробляється ⚙️',
    body: 'Ваше замовлення #{order} взято в обробку',
  },
  shipped: {
    title: 'Замовлення відправлено! 🚚',
    body: 'Замовлення #{order} відправлено{ttn}',
  },
  delivered: {
    title: 'Замовлення доставлено! ✅',
    body: 'Замовлення #{order} доставлено. Дякуємо за покупку!',
  },
  cancelled: {
    title: 'Замовлення скасовано ❌',
    body: 'Замовлення #{order} було скасовано',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { order_id, new_status, ttn } = await req.json();
    if (!order_id || !new_status) {
      return new Response(JSON.stringify({ error: 'order_id and new_status required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: order } = await supabase
      .from('orders')
      .select('profile_id, order_number, total')
      .eq('id', order_id)
      .single();

    if (!order?.profile_id) {
      return new Response(JSON.stringify({ ok: true, notified: 0, reason: 'guest or not found' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const msg = STATUS_MSG[new_status];
    if (!msg) {
      return new Response(JSON.stringify({ ok: false, reason: 'unknown status' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const ttnSuffix = ttn ? `. ТТН: ${ttn}` : '';
    const title = msg.title;
    const body = msg.body.replace('{order}', order.order_number).replace('{ttn}', ttnSuffix);

    await supabase.from('notifications_feed').insert({
      profile_id: order.profile_id,
      type: 'order',
      title,
      body,
      link: '/account/orders',
      metadata: { order_id, order_number: order.order_number, status: new_status, ttn: ttn || null },
    });

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('profile_id', order.profile_id)
      .eq('is_active', true);

    let pushSent = 0;
    if (tokens?.length) {
      const messages = tokens.map(t => ({
        to: t.token,
        title,
        body,
        data: { type: 'order_status', order_id, status: new_status, ttn: ttn || null },
        sound: 'default',
        badge: 1,
      }));

      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });
        if (res.ok) pushSent = messages.length;
      } catch (e) { console.error('Push error:', e); }
    }

    // === TELEGRAM CLIENT NOTIFICATION ===
    let telegramSent = false;
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (telegramBotToken && order.profile_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('telegram_chat_id')
          .eq('id', order.profile_id)
          .single();

        if (profile?.telegram_chat_id) {
          const chatId = profile.telegram_chat_id;
          let tgMessage = '';

          if (new_status === 'processing') {
            tgMessage = `⚙️ Замовлення #${order.order_number} взято в обробку.\nОчікуйте відправку протягом доби.`;
          } else if (new_status === 'shipped' && ttn) {
            tgMessage = `🚚 Замовлення #${order.order_number} відправлено!\n\n📋 ТТН: <code>${ttn}</code>`;
          } else if (new_status === 'delivered') {
            tgMessage = `📬 Замовлення #${order.order_number} доставлено!\n\nДякуємо за покупку! 🙌`;
          } else if (new_status === 'cancelled') {
            tgMessage = `❌ Замовлення #${order.order_number} скасовано.\nЗверніться до менеджера за деталями.`;
          }

          if (tgMessage) {
            const tgBody: Record<string, unknown> = {
              chat_id: chatId,
              text: tgMessage,
              parse_mode: 'HTML',
            };

            // Add tracking button for shipped orders
            if (new_status === 'shipped' && ttn) {
              tgBody.reply_markup = {
                inline_keyboard: [[
                  { text: '📍 Трекінг НП', url: `https://novaposhta.ua/tracking/?cargo_number=${ttn}` },
                ]],
              };
            }

            const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tgBody),
            });
            telegramSent = tgRes.ok;
          }
        }
      } catch (e) { console.error('Telegram client notify error:', e); }
    }

    return new Response(JSON.stringify({ ok: true, notified: pushSent, telegramSent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('notify-order-status error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
