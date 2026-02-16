// ================================================================
//  POST /api/v1/customers — Upsert контрагентів з 1С
//  Permission: customers:write
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError } from '@/lib/api/helpers';
import { validateCustomerUpsert, validateArray } from '@/lib/api/validators';
import type { CustomerUpsertInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export const POST = withApiAuth('customers:write', async (req: NextRequest) => {
  const body = await req.json();

  // Валідація масиву
  const { items, error: arrayError } = validateArray<CustomerUpsertInput>(body, 500, 'customers');
  if (arrayError || !items) {
    return apiValidationError(arrayError || 'Invalid input');
  }

  // Валідація кожного елемента
  const allErrors: Array<{ field: string; message: string }> = [];
  for (let i = 0; i < items.length; i++) {
    const errs = validateCustomerUpsert(items[i], i);
    allErrors.push(...errs);
  }

  if (allErrors.length > 0) {
    return apiValidationError(
      `Validation failed for ${allErrors.length} field(s)`,
      allErrors.slice(0, 50)
    );
  }

  const supabase = createAdminClient();

  let created = 0;
  let updated = 0;
  const errors: Array<{ external_id: string; error: string }> = [];

  // Отримати існуючих клієнтів за external_id
  const externalIds = items.map(c => c.external_id);
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id, external_id, email')
    .in('external_id', externalIds);

  const existingMap = new Map(
    (existingProfiles || []).map(p => [p.external_id, p])
  );

  for (const item of items) {
    try {
      const existing = existingMap.get(item.external_id);

      // Розбити name на first_name + last_name
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
        // UPDATE
        const { error } = await supabase
          .from('profiles')
          .update(row)
          .eq('external_id', item.external_id);

        if (error) {
          errors.push({ external_id: item.external_id, error: error.message });
        } else {
          updated++;
        }
      } else {
        // INSERT — потрібен email і зв'язка з auth.users
        // Якщо email немає — створюємо профіль без auth user
        // (клієнт ще не зареєстрований на сайті)
        if (item.email) {
          row.email = item.email;
        } else {
          // Генеруємо placeholder email
          row.email = `1c_${item.external_id}@placeholder.local`;
        }

        // Для profiles потрібен id = auth.users.id
        // Але клієнт з 1С може не мати auth user
        // Вставляємо напряму без прив'язки до auth
        const { error } = await supabase
          .from('profiles')
          .insert(row);

        if (error) {
          errors.push({ external_id: item.external_id, error: error.message });
        } else {
          created++;
        }
      }
    } catch (err) {
      errors.push({
        external_id: item.external_id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return apiSuccess({ created, updated, errors });
});
