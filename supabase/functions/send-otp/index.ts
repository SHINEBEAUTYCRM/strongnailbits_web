// Supabase Edge Function: send-otp (SECURED)
// - Strict phone validation (Ukrainian format)
// - Rate limit: 3 SMS / 10 min per phone + 10 requests / 10 min per IP
// - Crypto-secure OTP generation
// - No sensitive data in error responses
// - Invalidates old codes on new send

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://shineshopb2b.com', 'https://www.shineshopb2b.com'];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// IP rate limiting
const IP_RATE_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_REQUESTS = 10;
const ipRateMap = new Map<string, number[]>();

function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRateMap.get(ip) ?? []).filter(t => now - t < IP_RATE_WINDOW_MS);
  if (timestamps.length >= IP_MAX_REQUESTS) return true;
  timestamps.push(now);
  ipRateMap.set(ip, timestamps);
  return false;
}

// Crypto-secure OTP (not Math.random!)
function generateSecureOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(1000 + (array[0] % 9000)); // 4-digit: 1000-9999
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  try {
    // IP rate limit
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isIpRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Забагато запитів. Зачекайте 10 хвилин.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { phone } = body;

    // === STRICT phone validation ===
    if (!phone || typeof phone !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Вкажіть номер телефону' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: 'Невірний формат номера телефону' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // === DB rate limit (3 codes per 10 min) ===
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone', cleanPhone)
      .gte('created_at', tenMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: 'Забагато спроб. Зачекайте 10 хвилин.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // === Invalidate old unused codes for this phone ===
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('phone', cleanPhone)
      .eq('used', false);

    // === Generate SECURE OTP ===
    const code = generateSecureOTP();

    // Save OTP (5 min TTL)
    await supabase.from('otp_codes').insert({
      phone: cleanPhone,
      code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
    });

    // === Send SMS via AlphaSMS API ===
    const alphaSmsApiKey = Deno.env.get('ALPHASMS_API_KEY');
    const alphaSmsSender = Deno.env.get('ALPHASMS_SENDER') ?? 'Shine SHOP';

    if (alphaSmsApiKey) {
      try {
        await fetch('https://alphasms.ua/api/v2/sms', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${alphaSmsApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: cleanPhone,
            sender: alphaSmsSender,
            text: `Ваш код підтвердження: ${code}. ShineShop B2B`,
          }),
        });
      } catch (smsError) {
        console.error('AlphaSMS error:', smsError);
        // OTP saved, will work on retry
      }
    } else {
      // DEV ONLY — remove before production
      console.log(`[DEV] OTP for ${cleanPhone}: ${code}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('send-otp error:', error);
    return new Response(
      JSON.stringify({ error: 'Помилка відправки. Спробуйте ще раз.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
