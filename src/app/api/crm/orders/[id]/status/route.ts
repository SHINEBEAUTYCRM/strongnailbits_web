// ================================================================
//  GET /api/crm/orders/[id]/status — статус замовлення CRM
// ================================================================

import { NextRequest } from 'next/server';
import { requireCrmAuth, handleCorsOptions, crmJson } from '@/lib/crm-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireCrmAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from('crm_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) {
      return crmJson({ error: 'Order not found' }, { status: 404 });
    }

    // Сформувати tracking URL якщо є tracking_number
    let trackingUrl: string | null = null;
    if (order.tracking_number) {
      trackingUrl = `https://novaposhta.ua/tracking/?cargo_number=${order.tracking_number}`;
    }

    return crmJson({
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      tracking_number: order.tracking_number || null,
      tracking_url: trackingUrl,
      items: order.items,
      total: Number(order.subtotal),
      salon_name: order.salon_name,
      contact_phone: order.contact_phone,
      delivery_method: order.delivery_method,
      created_at: order.created_at,
      updated_at: order.updated_at,
    });
  } catch (err) {
    console.error('[CRM API] Order status error:', err);
    return crmJson(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
