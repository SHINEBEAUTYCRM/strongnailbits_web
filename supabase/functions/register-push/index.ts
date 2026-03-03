// Supabase Edge Function: register-push (SECURED)
// Requires authenticated user (JWT) — anonymous calls blocked

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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  try {
    // === AUTHENTICATION REQUIRED ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { token, platform } = body;

    // === VALIDATE token ===
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid push token' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Expo push token format: ExponentPushToken[xxx]
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // === VALIDATE platform ===
    const VALID_PLATFORMS = ['ios', 'android'];
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return new Response(
        JSON.stringify({ error: 'Invalid platform' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // === LIMIT: max 5 tokens per user ===
    const { data: existingTokens } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('profile_id', user.id);

    if (existingTokens && existingTokens.length >= 5) {
      // Delete oldest tokens, keep 4
      const { data: oldTokens } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('profile_id', user.id)
        .order('last_used_at', { ascending: true })
        .limit(existingTokens.length - 4);

      if (oldTokens) {
        await supabase
          .from('push_tokens')
          .delete()
          .in('id', oldTokens.map(t => t.id));
      }
    }

    // === UPSERT (uses authenticated user ID, NOT client-supplied userId) ===
    await supabase.from('push_tokens').upsert(
      {
        token,
        platform,
        profile_id: user.id, // FROM JWT, not from client!
        is_active: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('register-push error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
