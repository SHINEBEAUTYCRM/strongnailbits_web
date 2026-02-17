// ================================================================
//  GET /api/v1/orders/new — Нові замовлення для 1С
//  Permission: orders:read
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, parsePagination } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export const GET = withApiAuth('orders:read', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const { page, per_page, offset } = parsePagination(searchParams);

  const supabase = createAdminClient();

  // Фільтр: synced_at IS NULL = нові замовлення (не забрані 1С)
  let query = supabase
    .from('orders')
    .select('*, profiles!orders_profile_id_fkey(id, external_id, phone, first_name, last_name, email, company)', { count: 'exact' })
    .is('synced_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  // Опціональний фільтр по даті
  const updatedAfter = searchParams.get('updated_after');
  if (updatedAfter) {
    query = query.gte('created_at', updatedAfter);
  }

  // Фільтр по статусу
  const status = searchParams.get('status');
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[API v1/orders/new] Query error:', error);
    return apiSuccess([], { total: 0, page, per_page, total_pages: 0 });
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / per_page);

  // Маппінг до формату API
  const mapped = (data || []).map((order: Record<string, unknown>) => {
    const profile = order.profiles as Record<string, unknown> | null;

    return {
      id: order.id,
      order_number: order.order_number,
      created_at: order.created_at,
      customer_external_id: profile?.external_id || null,
      customer_phone: profile?.phone || (order.shipping_address as Record<string, unknown>)?.phone || null,
      customer_name: profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        : (order.shipping_address as Record<string, unknown>)?.recipient || null,
      delivery_type: order.shipping_method,
      delivery_address: formatAddress(order.shipping_address as Record<string, string> | null),
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      bonus_used: order.bonus_used || 0,
      discount_amount: order.discount || 0,
      total_amount: order.total,
      notes: order.notes,
      items: formatOrderItems(order.items as Array<Record<string, unknown>> | null),
    };
  });

  return apiSuccess(mapped, { total, page, per_page, total_pages });
});

function formatAddress(addr: Record<string, string> | null): string {
  if (!addr) return '';
  const parts = [addr.city, addr.warehouse, addr.street, addr.house, addr.address].filter(Boolean);
  return parts.join(', ');
}

function formatOrderItems(items: Array<Record<string, unknown>> | null): Array<Record<string, unknown>> {
  if (!items || !Array.isArray(items)) return [];

  return items.map(item => ({
    product_id: item.product_id,
    product_external_id: item.product_external_id || null,
    sku: item.sku || null,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    discount_percent: item.discount_percent || 0,
    total: item.total,
  }));
}
