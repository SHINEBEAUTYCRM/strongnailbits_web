// ================================================================
//  API: /api/integrations/logs
//  Логи виконання інтеграцій
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';

/**
 * GET /api/integrations/logs
 *
 * Query params:
 *   slug     — фільтр по сервісу (опціонально)
 *   status   — фільтр по статусу: success|error|warning|info
 *   limit    — кількість записів (default 50, max 200)
 *   offset   — зсув для пагінації
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const slug = searchParams.get('slug');
    const status = searchParams.get('status');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      200
    );
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('integration_logs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (slug) {
      query = query.eq('service_slug', slug);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
