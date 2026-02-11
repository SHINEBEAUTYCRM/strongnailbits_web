// ================================================================
//  PATCH /api/v1/customers/:id/synced — Позначити клієнта як синхронізованого
//  Permission: customers:write
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError, apiNotFound } from '@/lib/api/helpers';
import { fireWebhook } from '@/lib/api/webhooks';

export const dynamic = 'force-dynamic';

export const PATCH = withApiAuth('customers:write', async (
  req: NextRequest, ctx
) => {
  // Отримати id з URL
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  // /api/v1/customers/[id]/synced → id = segments[segments.length - 2]
  const customerId = segments[segments.length - 2];

  if (!customerId) {
    return apiValidationError('Customer ID is required in URL');
  }

  const body = await req.json();
  const { external_id } = body as { external_id?: string };

  if (!external_id) {
    return apiValidationError('external_id is required in body');
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      external_id,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .select('id')
    .single();

  if (error || !data) {
    return apiNotFound(`Customer with id "${customerId}" not found`);
  }

  fireWebhook('customer.synced', { customer_id: data.id, external_id }, ctx.tenantId).catch(() => {});

  return apiSuccess({ id: data.id, external_id, synced: true });
});
