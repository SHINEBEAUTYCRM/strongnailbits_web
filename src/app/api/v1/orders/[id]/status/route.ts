// ================================================================
//  PATCH /api/v1/orders/:id/status — Оновити статус замовлення з 1С
//  Permission: orders:write
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError, apiNotFound } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];
const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed'];

export const PATCH = withApiAuth('orders:write', async (req: NextRequest) => {
  // Отримати id з URL
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const orderId = segments[segments.length - 2];

  if (!orderId) {
    return apiValidationError('Order ID is required in URL');
  }

  const body = await req.json();
  const { status, ttn_number, shipped_at, payment_status } = body as {
    status?: string;
    ttn_number?: string;
    shipped_at?: string;
    payment_status?: string;
  };

  // Валідація
  const errors: Array<{ field: string; message: string }> = [];

  if (status && !VALID_STATUSES.includes(status)) {
    errors.push({ field: 'status', message: `must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  if (payment_status && !VALID_PAYMENT_STATUSES.includes(payment_status)) {
    errors.push({ field: 'payment_status', message: `must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` });
  }

  if (errors.length > 0) {
    return apiValidationError('Validation failed', errors);
  }

  if (!status && !ttn_number && !shipped_at && !payment_status) {
    return apiValidationError('At least one field is required: status, ttn_number, shipped_at, payment_status');
  }

  const supabase = createAdminClient();

  // Побудувати об'єкт оновлення
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status) update.status = status;
  if (ttn_number !== undefined) update.ttn = ttn_number;
  if (shipped_at) update.shipped_at = shipped_at;
  if (payment_status) update.payment_status = payment_status;

  const { data, error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .select('id, status, ttn, payment_status')
    .single();

  if (error || !data) {
    return apiNotFound(`Order with id "${orderId}" not found`);
  }

  return apiSuccess({
    id: data.id,
    status: data.status,
    ttn_number: data.ttn,
    payment_status: data.payment_status,
  });
});
