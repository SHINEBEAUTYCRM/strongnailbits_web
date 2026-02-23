// ================================================================
//  PATCH /api/v1/products/stock — Швидке оновлення залишків
//  Пошук по SKU
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError } from '@/lib/api/helpers';
import { validateStockUpdate, validateArray } from '@/lib/api/validators';
import { fireWebhook } from '@/lib/api/webhooks';
import type { StockUpdateInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export const PATCH = withApiAuth('products:write', async (req: NextRequest, ctx) => {
  const body = await req.json();

  const { items, error: arrayError } = validateArray<StockUpdateInput>(body, 500, 'stock updates');
  if (arrayError || !items) return apiValidationError(arrayError || 'Invalid input');

  const allErrors: Array<{ field: string; message: string }> = [];
  for (let i = 0; i < items.length; i++) {
    allErrors.push(...validateStockUpdate(items[i], i));
  }
  if (allErrors.length > 0) {
    return apiValidationError(`Validation failed for ${allErrors.length} field(s)`, allErrors.slice(0, 50));
  }

  const supabase = createAdminClient();
  let updatedCount = 0;
  const errors: Array<{ sku: string; error: string }> = [];

  const skus = items.map(i => i.sku);
  const { data: existingProducts } = await supabase
    .from('products').select('id, sku').in('sku', skus);

  const skuToId = new Map((existingProducts || []).map(p => [p.sku, p.id]));

  for (const item of items) {
    const productId = skuToId.get(item.sku);
    if (!productId) {
      errors.push({ sku: item.sku, error: 'Product not found' });
      continue;
    }

    const updateData: Record<string, unknown> = {
      quantity: item.stock_qty,
      updated_at: new Date().toISOString(),
    };
    if (item.external_id) updateData.external_id = item.external_id;

    const { error } = await supabase.from('products').update(updateData).eq('id', productId);
    if (error) errors.push({ sku: item.sku, error: error.message });
    else updatedCount++;
  }

  if (updatedCount > 0) {
    fireWebhook('product.stock_updated', { updated: updatedCount }, ctx.tenantId).catch(() => {});
  }

  return apiSuccess({ updated: updatedCount, errors });
});
