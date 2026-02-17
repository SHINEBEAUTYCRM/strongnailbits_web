// ================================================================
//  GET /api/v1/payments/new — Нові оплати для 1С
//  Permission: payments:read
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, parsePagination } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export const GET = withApiAuth('payments:read', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const { page, per_page, offset } = parsePagination(searchParams);

  const supabase = createAdminClient();

  // Фільтр: synced_at IS NULL = нові оплати для 1С
  let query = supabase
    .from('payments')
    .select('*', { count: 'exact' })
    .is('synced_at', null)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  // Опціональний фільтр по даті
  const updatedAfter = searchParams.get('updated_after');
  if (updatedAfter) {
    query = query.gte('created_at', updatedAfter);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[API v1/payments/new] Query error:', error);
    return apiSuccess([], { total: 0, page, per_page, total_pages: 0 });
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / per_page);

  const mapped = (data || []).map(p => ({
    id: p.id,
    order_id: p.order_id,
    amount: p.amount,
    method: p.method,
    transaction_id: p.transaction_id,
    paid_at: p.paid_at,
    status: p.status,
  }));

  return apiSuccess(mapped, { total, page, per_page, total_pages });
});

/**
 * PATCH /api/v1/payments/new — Позначити оплати як синхронізовані
 * Body: { ids: string[] }
 */
export const PATCH = withApiAuth('payments:write', async (req: NextRequest) => {
  const body = await req.json();
  const { ids } = body as { ids?: string[] };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return apiSuccess({ updated: 0 });
  }

  const supabase = createAdminClient();

  const { error, count } = await supabase
    .from('payments')
    .update({ synced_at: new Date().toISOString() })
    .in('id', ids);

  if (error) {
    console.error('[API v1/payments] Sync error:', error);
  }

  return apiSuccess({ updated: count || ids.length });
});
