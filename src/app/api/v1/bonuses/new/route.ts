// ================================================================
//  GET /api/v1/bonuses/new — Нові бонусні операції для 1С
//  Permission: bonuses:read
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, parsePagination } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export const GET = withApiAuth('bonuses:read', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const { page, per_page, offset } = parsePagination(searchParams);

  const supabase = createAdminClient();

  // Фільтр: synced_at IS NULL + source = 'site' = нові бонуси з сайту для 1С
  let query = supabase
    .from('bonuses')
    .select('*', { count: 'exact' })
    .is('synced_at', null)
    .eq('source', 'site')
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  const updatedAfter = searchParams.get('updated_after');
  if (updatedAfter) {
    query = query.gte('created_at', updatedAfter);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[API v1/bonuses/new] Query error:', error);
    return apiSuccess([], { total: 0, page, per_page, total_pages: 0 });
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / per_page);

  const mapped = (data || []).map(b => ({
    id: b.id,
    customer_external_id: b.customer_external_id,
    order_id: b.order_id,
    type: b.type,
    amount: b.amount,
    reason: b.reason,
    created_at: b.created_at,
  }));

  return apiSuccess(mapped, { total, page, per_page, total_pages });
});

/**
 * PATCH /api/v1/bonuses/new — Позначити бонуси як синхронізовані
 * Body: { ids: string[] }
 */
export const PATCH = withApiAuth('bonuses:write', async (req: NextRequest) => {
  const body = await req.json();
  const { ids } = body as { ids?: string[] };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return apiSuccess({ updated: 0 });
  }

  const supabase = createAdminClient();

  const { error, count } = await supabase
    .from('bonuses')
    .update({ synced_at: new Date().toISOString() })
    .in('id', ids);

  if (error) {
    console.error('[API v1/bonuses] Sync error:', error);
  }

  return apiSuccess({ updated: count || ids.length });
});
