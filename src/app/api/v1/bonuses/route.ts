// ================================================================
//  POST /api/v1/bonuses — Нарахувати/списати бонуси з 1С
//  Permission: bonuses:write
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError } from '@/lib/api/helpers';
import { validateBonus } from '@/lib/api/validators';
import type { BonusInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export const POST = withApiAuth('bonuses:write', async (req: NextRequest, ctx) => {
  const body = await req.json();

  // Може бути один об'єкт або масив
  const items = Array.isArray(body) ? body : [body];

  if (items.length === 0) {
    return apiValidationError('At least one bonus operation is required');
  }

  if (items.length > 100) {
    return apiValidationError('Maximum 100 bonus operations per request');
  }

  // Валідація
  const allErrors: Array<{ field: string; message: string }> = [];
  for (const item of items) {
    const errs = validateBonus(item as BonusInput);
    allErrors.push(...errs);
  }

  if (allErrors.length > 0) {
    return apiValidationError(
      `Validation failed for ${allErrors.length} field(s)`,
      allErrors.slice(0, 50)
    );
  }

  const supabase = createAdminClient();
  const tenantId = ctx.tenantId;

  let created = 0;
  const errors: Array<{ customer_external_id: string; error: string }> = [];

  // Знайти profile_id за customer_external_id
  const customerExternalIds = [...new Set(items.map((b: BonusInput) => b.customer_external_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, external_id, loyalty_points')
    .in('external_id', customerExternalIds);

  const profileMap = new Map(
    (profiles || []).map(p => [p.external_id, p])
  );

  for (const item of items as BonusInput[]) {
    try {
      const profile = profileMap.get(item.customer_external_id);

      const { error } = await supabase
        .from('bonuses')
        .insert({
          tenant_id: tenantId,
          profile_id: profile?.id || null,
          customer_external_id: item.customer_external_id,
          order_id: item.order_id || null,
          type: item.type,
          amount: item.amount,
          reason: item.reason || null,
          source: '1c',
          synced_at: new Date().toISOString(),
        });

      if (error) {
        errors.push({ customer_external_id: item.customer_external_id, error: error.message });
      } else {
        created++;

        // Оновити loyalty_points в профілі
        if (profile) {
          const currentPoints = Number(profile.loyalty_points) || 0;
          const newPoints = item.type === 'accrual'
            ? currentPoints + item.amount
            : Math.max(0, currentPoints - item.amount);

          await supabase
            .from('profiles')
            .update({ loyalty_points: newPoints, updated_at: new Date().toISOString() })
            .eq('id', profile.id);
        }
      }
    } catch (err) {
      errors.push({
        customer_external_id: item.customer_external_id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return apiSuccess({ created, errors });
});
