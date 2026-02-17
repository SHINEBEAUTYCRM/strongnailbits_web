// ================================================================
//  POST /api/v1/prices — Індивідуальні B2B ціни з 1С
//  Permission: prices:write
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError } from '@/lib/api/helpers';
import { validatePrice, validateArray } from '@/lib/api/validators';
import type { PriceInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export const POST = withApiAuth('prices:write', async (req: NextRequest, ctx) => {
  const body = await req.json();

  // Валідація масиву
  const { items, error: arrayError } = validateArray<PriceInput>(body, 1000, 'prices');
  if (arrayError || !items) {
    return apiValidationError(arrayError || 'Invalid input');
  }

  // Валідація кожного елемента
  const allErrors: Array<{ field: string; message: string }> = [];
  for (let i = 0; i < items.length; i++) {
    const errs = validatePrice(items[i], i);
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
  let updated = 0;
  const errors: Array<{ customer_external_id: string; product_external_id: string; error: string }> = [];

  // Знайти profile_id та product_id для зв'язки
  const customerExternalIds = [...new Set(items.map(p => p.customer_external_id))];
  const productExternalIds = [...new Set(items.map(p => p.product_external_id))];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, external_id')
    .in('external_id', customerExternalIds);

  const { data: products } = await supabase
    .from('products')
    .select('id, external_id')
    .in('external_id', productExternalIds);

  const profileMap = new Map((profiles || []).map(p => [p.external_id, p.id]));
  const productMap = new Map((products || []).map(p => [p.external_id, p.id]));

  for (const item of items) {
    try {
      const profileId = profileMap.get(item.customer_external_id) || null;
      const productId = productMap.get(item.product_external_id) || null;

      // Upsert за (tenant_id, customer_external_id, product_external_id)
      const { data: existing } = await supabase
        .from('customer_prices')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('customer_external_id', item.customer_external_id)
        .eq('product_external_id', item.product_external_id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('customer_prices')
          .update({
            price: item.price,
            profile_id: profileId,
            product_id: productId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          errors.push({ ...item, error: error.message });
        } else {
          updated++;
        }
      } else {
        const { error } = await supabase
          .from('customer_prices')
          .insert({
            tenant_id: tenantId,
            customer_external_id: item.customer_external_id,
            product_external_id: item.product_external_id,
            profile_id: profileId,
            product_id: productId,
            price: item.price,
          });

        if (error) {
          errors.push({ ...item, error: error.message });
        } else {
          created++;
        }
      }
    } catch (err) {
      errors.push({
        customer_external_id: item.customer_external_id,
        product_external_id: item.product_external_id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return apiSuccess({ created, updated, errors });
});
