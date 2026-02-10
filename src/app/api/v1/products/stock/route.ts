// ================================================================
//  PATCH /api/v1/products/stock — Швидке оновлення залишків
//  Permission: products:write
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError } from '@/lib/api/helpers';
import { validateStockUpdate, validateArray } from '@/lib/api/validators';
import type { StockUpdateInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export const PATCH = withApiAuth('products:write', async (req: NextRequest) => {
  const body = await req.json();

  // Валідація масиву
  const { items, error: arrayError } = validateArray<StockUpdateInput>(body, 500, 'stock updates');
  if (arrayError || !items) {
    return apiValidationError(arrayError || 'Invalid input');
  }

  // Валідація кожного елемента
  const allErrors: Array<{ field: string; message: string }> = [];
  for (let i = 0; i < items.length; i++) {
    const errs = validateStockUpdate(items[i], i);
    allErrors.push(...errs);
  }

  if (allErrors.length > 0) {
    return apiValidationError(
      `Validation failed for ${allErrors.length} field(s)`,
      allErrors.slice(0, 50)
    );
  }

  const supabase = createAdminClient();

  let updated = 0;
  const errors: Array<{ external_id: string; error: string }> = [];

  for (const item of items) {
    const { error } = await supabase
      .from('products')
      .update({
        quantity: item.stock_qty,
        updated_at: new Date().toISOString(),
      })
      .eq('external_id', item.external_id);

    if (error) {
      errors.push({ external_id: item.external_id, error: error.message });
    } else {
      updated++;
    }
  }

  return apiSuccess({ updated, errors: errors.length > 0 ? errors : undefined });
});
