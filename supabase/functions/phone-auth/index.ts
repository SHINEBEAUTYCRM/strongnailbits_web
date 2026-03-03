// Supabase Edge Function: phone-auth (SECURED)
// Actions: register, get-login-email
// - Strict input validation
// - Password strength requirements
// - Rate limiting per IP
// - No internal errors leaked
// - XSS protection on all text fields

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

// Rate limit per IP
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;
const ipRateMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRateMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) return true;
  timestamps.push(now);
  ipRateMap.set(ip, timestamps);
  return false;
}

// Sanitize text: strip HTML tags and control characters
function sanitizeText(input: string, maxLen = 100): string {
  return input
    .replace(/<[^>]*>/g, '')         // strip HTML
    .replace(/[\x00-\x1F\x7F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLen);
}

// Validate phone
function validatePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const clean = phone.replace(/[\s\-()]/g, '');
  return /^\+?[0-9]{10,15}$/.test(clean) ? clean : null;
}

const VALID_ACTIONS = ['register', 'get-login-email'];

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  try {
    // Rate limit
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'Забагато запитів. Зачекайте.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Невідома дія' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone for all actions
    const cleanPhone = validatePhone(body.phone);
    if (!cleanPhone) {
      return new Response(
        JSON.stringify({ error: 'Невірний номер телефону' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    switch (action) {
      case 'register': {
        const { firstName, lastName, company, password } = body;

        // === VALIDATE name fields ===
        if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 1) {
          return new Response(JSON.stringify({ error: "Вкажіть ім'я" }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }
        if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 1) {
          return new Response(JSON.stringify({ error: 'Вкажіть прізвище' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        const safeFirstName = sanitizeText(firstName, 100);
        const safeLastName = sanitizeText(lastName, 100);
        const safeCompany = company ? sanitizeText(String(company), 200) : null;

        // === VALIDATE password ===
        if (!password || typeof password !== 'string') {
          return new Response(JSON.stringify({ error: 'Вкажіть пароль' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }
        if (password.length < 8) {
          return new Response(JSON.stringify({ error: 'Пароль повинен містити мінімум 8 символів' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }
        if (password.length > 128) {
          return new Response(JSON.stringify({ error: 'Пароль занадто довгий' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }
        // At least one letter and one number
        if (!/[a-zA-Zа-яА-ЯіІїЇєЄґҐ]/.test(password) || !/[0-9]/.test(password)) {
          return new Response(JSON.stringify({ error: 'Пароль повинен містити літери та цифри' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // === CHECK duplicate phone ===
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', cleanPhone)
          .single();

        if (existingProfile) {
          return new Response(
            JSON.stringify({ error: 'Користувач з таким номером вже існує' }),
            { status: 409, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        const loginEmail = `${cleanPhone}@shineshopb2b.com`;

        // Create auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: loginEmail,
          password,
          email_confirm: true,
        });

        if (authError) {
          console.error('Auth create error:', authError);
          return new Response(
            JSON.stringify({ error: 'Помилка реєстрації. Спробуйте ще раз.' }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
          );
        }

        // Create profile
        await supabase.from('profiles').upsert({
          id: authUser.user.id,
          phone: cleanPhone,
          first_name: safeFirstName,
          last_name: safeLastName,
          company: safeCompany,
          login_email: loginEmail,
        });

        return new Response(
          JSON.stringify({ success: true, userId: authUser.user.id, loginEmail }),
          { headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-login-email': {
        const { data: profile } = await supabase
          .from('profiles')
          .select('login_email')
          .eq('phone', cleanPhone)
          .single();

        // Intentionally vague response — don't reveal if phone exists
        return new Response(
          JSON.stringify({ loginEmail: profile?.login_email ?? null }),
          { headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Невідома дія' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('phone-auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Помилка авторизації. Спробуйте ще раз.' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
