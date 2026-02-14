// ================================================================
//  GET /api/v1/health — Перевірка підключення
//  Permission: будь-який валідний токен
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientIP, hashToken } from '@/lib/api/helpers';
import { checkRateLimit } from '@/lib/api/rate-limiter';
import type { ApiTokenRow } from '@/lib/api/types';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing API token. Use: Authorization: Bearer sk_live_...' } },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Empty API token' } },
        { status: 401 },
      );
    }

    const tokenHash = await hashToken(token);
    const supabase = createAdminClient();

    const { data: tokenRow, error: tokenError } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API token' } },
        { status: 401 },
      );
    }

    const row = tokenRow as ApiTokenRow;

    // Check expiry
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Token expired' } },
        { status: 401 },
      );
    }

    // Rate limit info
    const rateCheck = checkRateLimit(row.id, row.rate_limit);
    const ip = getClientIP(req.headers);

    const response = NextResponse.json({
      success: true,
      data: {
        status: 'ok',
        token_name: row.name,
        permissions: row.permissions || [],
        rate_limit: row.rate_limit,
        rate_remaining: rateCheck.remaining,
        ip_address: ip,
        server_time: new Date().toISOString(),
        api_version: 'v1',
      },
    });

    response.headers.set('X-RateLimit-Limit', String(row.rate_limit));
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));

    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Internal server error' } },
      { status: 500 },
    );
  }
}
