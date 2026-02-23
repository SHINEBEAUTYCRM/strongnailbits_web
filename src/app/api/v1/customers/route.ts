// ================================================================
//  POST /api/v1/customers — Upsert контрагентів з 1С
//  FIX: генерація id при INSERT, email не обов'язковий
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError } from '@/lib/api/helpers';
import { fireWebhook } from '@/lib/api/webhooks';
import { validateCustomerUpsert, validateArray } from '@/lib/api/validators';
import type { CustomerUpsertInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export const POST = withApiAuth('customers:write', async (req: NextRequest, ctx) => {
  const body = await req.json();

  const { items, error: arrayError } = validateArray<CustomerUpsertInput>(body, 500, 'customers');
  if (arrayError || !items) return apiValidationError(arrayError || 'Invalid input');

  const allErrors: Array<{ field: string; message: string }> = [];
  for (let i = 0; i < items.length; i++) {
    allErrors.push(...validateCustomerUpsert(items[i], i));
  }
  if (allErrors.length > 0) {
    return apiValidationError(`Validation failed for ${allErrors.length} field(s)`, allErrors.slice(0, 50));
  }

  const supabase = createAdminClient();
  let created = 0;
  let updated = 0;
  const errors: Array<{ external_id: string; error: string }> = [];

  const externalIds = items.map(c => c.external_id);
  const { data: existingProfiles } = await supabase
    .from('profiles').select('id, external_id, email').in('external_id', externalIds);

  const existingMap = new Map((existingProfiles || []).map(p => [p.external_id, p]));

  for (const item of items) {
    try {
      const existing = existingMap.get(item.external_id);
      const nameParts = (item.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const row: Record<string, unknown> = {
        external_id: item.external_id,
        first_name: firstName,
        last_name: lastName,
        company: item.company_name ?? null,
        company_code: item.company_code ?? null,
        phone: item.phone ?? null,
        email: item.email ?? null,
        is_b2b: item.is_b2b ?? false,
        discount_percent: item.discount_percent ?? 0,
        credit_limit: item.credit_limit ?? 0,
        payment_terms_days: item.payment_terms_days ?? 0,
        balance: item.balance ?? 0,
        total_spent: item.total_purchased ?? 0,
        loyalty_tier: item.loyalty_tier || 'bronze',
        loyalty_points: item.loyalty_points ?? 0,
        manager_name: item.manager_name ?? null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase.from('profiles').update(row).eq('external_id', item.external_id);
        if (error) errors.push({ external_id: item.external_id, error: error.message });
        else updated++;
      } else {
        const { error } = await supabase.from('profiles').insert({
          ...row,
          id: crypto.randomUUID(),
          synced_at: new Date().toISOString(),
        });
        if (error) errors.push({ external_id: item.external_id, error: error.message });
        else created++;
      }
    } catch (err) {
      errors.push({
        external_id: item.external_id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  if (created > 0 || updated > 0) {
    fireWebhook('customer.updated', { created, updated, total: items.length }, ctx.tenantId).catch(() => {});
  }

  return apiSuccess({ created, updated, errors });
});
