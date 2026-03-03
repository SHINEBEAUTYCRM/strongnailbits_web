// Supabase Edge Function: send-push (SECURED)
// ONLY callable by service_role (from DB triggers or other edge functions)
// NOT accessible from client apps

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://shineshopb2b.com', 'https://www.shineshopb2b.com'];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // === AUTHORIZATION: only service_role can call this ===
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller is using service_role key (internal calls only)
    if (!authHeader.includes(serviceRoleKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    const { profile_id, type, title, body, order_number, status } = payload;

    // === VALIDATE ===
    if (!profile_id || typeof profile_id !== 'string') {
      return new Response(JSON.stringify({ error: 'profile_id required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const VALID_TYPES = ['order_status', 'order_ttn', 'promo', 'new_product', 'price_drop', 'bonus_accrual', 'system'];
    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid notification type' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey
    );

    // Verify profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profile_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Get active push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('profile_id', profile_id)
      .eq('is_active', true);

    // Build notification
    let notifTitle = (title ?? '').slice(0, 200);
    let notifBody = (body ?? '').slice(0, 500);

    if (type === 'order_status' && order_number) {
      notifTitle = `Замовлення #${String(order_number).slice(0, 20)}`;
      notifBody = `Статус змінено на: ${String(status).slice(0, 50)}`;
    }

    // Save to notifications_feed
    await supabase.from('notifications_feed').insert({
      profile_id,
      type,
      title: notifTitle,
      body: notifBody,
    });

    // Send via Expo Push API (if tokens exist)
    let sent = 0;
    if (tokens && tokens.length > 0) {
      const messages = tokens.map(t => ({
        to: t.token,
        sound: 'default',
        title: notifTitle,
        body: notifBody,
        data: { type, order_number, status },
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      sent = messages.length;
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('send-push error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
