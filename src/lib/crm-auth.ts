// ================================================================
//  StrongNailBits OS — CRM API Auth Middleware
//  Авторизація через header X-CRM-API-Key для /api/crm/*
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_ORIGIN = 'https://beauty-pro-crm-pi.vercel.app';

/**
 * CORS headers для CRM API
 */
export function corsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigin =
    origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN;

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-CRM-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Відповідь на OPTIONS preflight
 */
export function handleCorsOptions(req: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  });
}

/**
 * JSON-відповідь з CORS headers
 */
export function crmJson<T>(
  data: T,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  const headers = {
    ...corsHeaders(),
    ...(init?.headers || {}),
  };
  return NextResponse.json(data, { status: init?.status || 200, headers });
}

/**
 * Перевірити X-CRM-API-Key з таблиці crm_api_keys.
 * Повертає { valid, keyId, error }.
 */
export async function verifyCrmApiKey(req: NextRequest): Promise<{
  valid: boolean;
  keyId?: string;
  error?: string;
}> {
  const apiKey = req.headers.get('X-CRM-API-Key');
  if (!apiKey) {
    return { valid: false, error: 'Missing X-CRM-API-Key header' };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('crm_api_keys')
    .select('id, is_active')
    .eq('api_key', apiKey)
    .single();

  if (error || !data || !data.is_active) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Оновити last_used_at (non-blocking)
  supabase
    .from('crm_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {});

  return { valid: true, keyId: data.id };
}

/**
 * Перевірка CRM-авторизації. Повертає NextResponse з 401 якщо невалідна,
 * або null якщо авторизація пройшла.
 */
export async function requireCrmAuth(
  req: NextRequest
): Promise<NextResponse | null> {
  const auth = await verifyCrmApiKey(req);
  if (!auth.valid) {
    return crmJson({ error: auth.error }, { status: 401 });
  }
  return null;
}
