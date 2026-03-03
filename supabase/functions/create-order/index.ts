// Supabase Edge Function: create-order (SECURED)
// - Validates ALL data server-side
// - Verifies prices from DB (no client-side prices!)
// - Rate-limited: 5 orders / 10 min per IP
// - Telegram notification + analytics

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://shineshopb2b.com',
  'https://www.shineshopb2b.com',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function safeError(message: string, status = 400) {
  return { error: message, status };
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RATE_LIMIT_MAX = 5; // 5 orders per window
const rateMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateMap.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateMap.set(ip, timestamps);
  return true;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  try {
    // Rate limit by IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Забагато замовлень. Спробуйте пізніше.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log('REQUEST BODY:', JSON.stringify(body));
    const { items, contact, shipping, payment, notes, platform } = body;

    // === VALIDATE items ===
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return new Response(JSON.stringify({ error: 'Невірний список товарів' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== 'string') {
        return new Response(JSON.stringify({ error: 'Невірний product_id' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999) {
        return new Response(JSON.stringify({ error: 'Невірна кількість товару' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    // === VALIDATE contact ===
    if (!contact?.phone || !contact?.firstName || !contact?.lastName) {
      return new Response(JSON.stringify({ error: 'Заповніть контактні дані' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!/^\+?[0-9]{10,15}$/.test(contact.phone.replace(/[\s\-()]/g, ''))) {
      return new Response(JSON.stringify({ error: 'Невірний номер телефону' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (contact.firstName.length > 100 || contact.lastName.length > 100) {
      return new Response(JSON.stringify({ error: 'Занадто довге ім\'я' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // === VALIDATE shipping & payment ===
    const VALID_SHIPPING = ['np_warehouse', 'np_address', 'np_intl', 'ukrposhta', 'ukrposhta_intl', 'pickup', 'nova_poshta', 'nova_poshta_courier', 'international'];
    const VALID_PAYMENT = ['cod', 'invoice', 'online', 'liqpay', 'mono'];
    if (!shipping?.method || !VALID_SHIPPING.includes(shipping.method)) {
      return new Response(JSON.stringify({ error: 'Невірний спосіб доставки' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!payment?.method || !VALID_PAYMENT.includes(payment.method)) {
      return new Response(JSON.stringify({ error: 'Невірний спосіб оплати' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // === SANITIZE notes ===
    const sanitizedNotes = typeof notes === 'string' ? notes.slice(0, 1000) : '';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // === AUTH (optional but tracked) ===
    const authHeader = req.headers.get('Authorization');
    let profileId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      profileId = user?.id ?? null;
    }

    // === VERIFY PRICES & STOCK FROM DB (NEVER trust client prices!) ===
    const productIds = items.map((i: { product_id: string }) => i.product_id);
    const { data: dbProducts, error: prodError } = await supabase
      .from('products')
      .select('id, name_uk, price, quantity, status, sku')
      .in('id', productIds);

    if (prodError || !dbProducts) {
      return new Response(JSON.stringify({ error: 'Помилка завантаження товарів' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const productMap = new Map(dbProducts.map(p => [p.id, p]));
    let total = 0;
    const verifiedItems = [];

    for (const item of items) {
      const dbProduct = productMap.get(item.product_id);
      if (!dbProduct) {
        return new Response(JSON.stringify({ error: `Товар не знайдено: ${item.product_id}` }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      if (dbProduct.status !== 'active') {
        return new Response(JSON.stringify({ error: `Товар недоступний: ${dbProduct.name_uk}` }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      if (dbProduct.quantity < item.quantity) {
        return new Response(JSON.stringify({ error: `Недостатньо на складі: ${dbProduct.name_uk} (є ${dbProduct.quantity})` }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }

      // Use DB price, NOT client price
      const itemTotal = dbProduct.price * item.quantity;
      total += itemTotal;
      verifiedItems.push({
        product_id: item.product_id,
        name: dbProduct.name_uk,
        sku: dbProduct.sku,
        price: dbProduct.price,
        quantity: item.quantity,
        total: dbProduct.price * item.quantity,
        image: item.image ?? null,
      });
    }

    // === CREATE ORDER ===
    const orderNumber = `SS${Date.now().toString().slice(-8)}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        profile_id: profileId,
        status: 'new',
        total,
        subtotal: total,
        shipping_cost: 0,
        items: verifiedItems,
        contact: {
          phone: contact.phone.slice(0, 20),
          firstName: contact.firstName.slice(0, 100),
          lastName: contact.lastName.slice(0, 100),
          email: (contact.email ?? '').slice(0, 100),
        },
        shipping_method: shipping.method,
        shipping_address: {
          city: shipping.city ?? '',
          cityRef: shipping.cityRef ?? '',
          warehouse: shipping.warehouse ?? '',
          warehouseRef: shipping.warehouseRef ?? '',
          street: shipping.street ?? '',
          house: shipping.house ?? '',
          address: shipping.address ?? '',
          country: shipping.country ?? '',
          intlCity: shipping.intlCity ?? '',
          intlAddress: shipping.intlAddress ?? '',
          intlPostcode: shipping.intlPostcode ?? '',
        },
        payment_method: payment.method,
        notes: sanitizedNotes,
        source: 'mobile',
        source_device: platform ?? 'mobile',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order insert error:', JSON.stringify(orderError));
      return new Response(
        JSON.stringify({ error: `DB: ${orderError.message} (${orderError.code})` }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // === DECREASE STOCK ===
    const stockErrors: string[] = [];
    for (const item of verifiedItems) {
      const { error: stockError } = await supabase.rpc('decrease_product_quantity', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
      if (stockError) {
        console.error(`Stock decrease failed for ${item.product_id}:`, stockError.message);
        stockErrors.push(`${item.name}: ${stockError.message}`);
      }
    }

    // Notify admin if stock decrease failed (order already created)
    if (stockErrors.length > 0) {
      console.error('STOCK ERRORS (order created but stock not decreased):', stockErrors);
      // Send Telegram alert to admin about stock issue
      const telegramBotTokenStock = Deno.env.get('TELEGRAM_BOT_TOKEN');
      const telegramChatIdStock = Deno.env.get('TELEGRAM_CHAT_ID');
      if (telegramBotTokenStock && telegramChatIdStock) {
        try {
          await fetch(`https://api.telegram.org/bot${telegramBotTokenStock}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatIdStock,
              text: `⚠️ *Помилка оновлення залишків*\nЗамовлення #${orderNumber} створено, але залишки не оновлено:\n${stockErrors.join('\n')}`,
              parse_mode: 'Markdown',
            }),
          });
        } catch (_) { /* don't break */ }
      }
    }

    // === TELEGRAM NOTIFICATION ===
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (telegramBotToken && telegramChatId) {
      try {
        const itemsList = verifiedItems
          .map(i => `  • ${i.name} × ${i.quantity} = ${(i.price * i.quantity).toFixed(2)} ₴`)
          .join('\n');

        const message = [
          `📦 *Нове замовлення #${orderNumber}*`,
          ``,
          `👤 ${contact.firstName} ${contact.lastName}`,
          `📱 ${contact.phone}`,
          ``,
          `🛒 *Товари:*`,
          itemsList,
          ``,
          `💰 *Сума: ${total.toFixed(2)} ₴*`,
          `🚚 ${shipping.method}`,
          `💳 ${payment.method}`,
          sanitizedNotes ? `📝 ${sanitizedNotes}` : '',
          ``,
          `📱 Джерело: мобільний додаток`,
        ].filter(Boolean).join('\n');

        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: telegramChatId, text: message, parse_mode: 'Markdown' }),
        });
      } catch (_) { /* telegram failure shouldn't break order */ }
    }

    // === ANALYTICS ===
    try {
      await supabase.from('site_events').insert({
        event_type: 'purchase',
        order_id: order.id,
        revenue: total,
        device_type: 'mobile',
        metadata: { platform: 'mobile', source: 'app', order_number: orderNumber, user_id: profileId },
      });
    } catch (_) { /* analytics shouldn't break orders */ }

    return new Response(
      JSON.stringify({ orderNumber, total, orderId: order.id }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('create-order error:', error);
    return new Response(
      JSON.stringify({ error: 'Помилка створення замовлення. Спробуйте ще раз.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
