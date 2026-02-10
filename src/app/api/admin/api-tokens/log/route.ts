// ================================================================
//  Admin API: /api/admin/api-tokens/log
//  Лог API-запитів
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(10, parseInt(searchParams.get('per_page') || '50', 10)));
    const offset = (page - 1) * perPage;

    // Фільтри
    const tokenId = searchParams.get('token_id');
    const endpoint = searchParams.get('endpoint');
    const statusCode = searchParams.get('status_code');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabase
      .from('api_request_log')
      .select('*, api_tokens(name, token_prefix)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (tokenId) query = query.eq('token_id', tokenId);
    if (endpoint) query = query.ilike('endpoint', `%${endpoint}%`);
    if (statusCode) query = query.eq('status_code', parseInt(statusCode, 10));
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count || 0;

    return NextResponse.json({
      data: data || [],
      meta: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
