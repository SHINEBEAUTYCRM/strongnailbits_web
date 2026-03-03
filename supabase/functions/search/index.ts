// Supabase Edge Function: search (SECURED)
// - Input sanitization (no SQL injection via ilike patterns)
// - Rate limiting: 30 requests / min per IP
// - Query length limits
// - Uses anon key (read-only access)
// - No internal errors leaked

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

// Rate limiting per IP
const RATE_WINDOW_MS = 60 * 1000; // 1 min
const MAX_REQUESTS = 30;
const ipRateMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRateMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) return true;
  timestamps.push(now);
  ipRateMap.set(ip, timestamps);
  return false;
}

// Sanitize input for ilike patterns: escape special Postgres LIKE characters
function sanitizeForLike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

// Strip any non-printable or control characters
function sanitizeInput(input: string): string {
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

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
        JSON.stringify({ products: [], brands: [], error: 'Забагато запитів' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    let { query } = body;

    // Validate query
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ products: [], brands: [] }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    query = sanitizeInput(query);

    if (query.length < 2) {
      return new Response(
        JSON.stringify({ products: [], brands: [] }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Max query length
    if (query.length > 100) {
      query = query.slice(0, 100);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')! // anon key = read-only via RLS
    );

    // Sanitize for LIKE pattern to prevent injection
    const sanitized = sanitizeForLike(query);
    const searchTerm = `%${sanitized}%`;

    const [productsRes, brandsRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, slug, name_uk, name_ru, price, old_price, main_image_url, quantity, status, is_new, is_featured, brands(name, slug)')
        .eq('status', 'active')
        .or(`name_uk.ilike.${searchTerm},name_ru.ilike.${searchTerm},sku.ilike.${searchTerm}`)
        .order('quantity', { ascending: false })
        .limit(40),
      supabase
        .from('brands')
        .select('id, name, slug, logo_url')
        .ilike('name', searchTerm)
        .limit(10),
    ]);

    return new Response(
      JSON.stringify({
        products: productsRes.data ?? [],
        brands: brandsRes.data ?? [],
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('search error:', error);
    return new Response(
      JSON.stringify({ products: [], brands: [], error: 'Помилка пошуку' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
