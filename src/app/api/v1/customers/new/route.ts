// ================================================================
//  GET /api/v1/customers/new — Нові реєстрації для 1С
//  Permission: customers:read
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess } from '@/lib/api/helpers';
import { parsePagination } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export const GET = withApiAuth('customers:read', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const { page, per_page, offset } = parsePagination(searchParams);

  const supabase = createAdminClient();

  // Фільтр: synced_at IS NULL означає нові (не синхронізовані з 1С)
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .is('synced_at', null)
    .is('external_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  // Опціональний фільтр по даті
  const updatedAfter = searchParams.get('updated_after');
  if (updatedAfter) {
    query = query.gte('created_at', updatedAfter);
  }

  const { data, error, count } = await query;

  if (error) {
    return apiSuccess([], { total: 0, page, per_page, total_pages: 0 });
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / per_page);

  // Маппінг до формату API
  const mapped = (data || []).map(p => ({
    id: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(' '),
    phone: p.phone,
    email: p.email,
    company_name: p.company,
    is_b2b: p.is_b2b || p.type === 'wholesale',
    created_at: p.created_at,
  }));

  return apiSuccess(mapped, { total, page, per_page, total_pages });
});
