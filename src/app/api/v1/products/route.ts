// ================================================================
//  POST /api/v1/products — Upsert товарів з 1С
//  Permission: products:write
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api/helpers';
import { fireWebhook } from '@/lib/api/webhooks';
import { validateProductUpsert, validateArray } from '@/lib/api/validators';
import type { ProductUpsertInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export const POST = withApiAuth('products:write', async (req: NextRequest, ctx) => {
  const body = await req.json();

  // Валідація масиву
  const { items, error: arrayError } = validateArray<ProductUpsertInput>(body, 500, 'products');
  if (arrayError || !items) {
    return apiValidationError(arrayError || 'Invalid input');
  }

  // Валідація кожного елемента
  const allErrors: Array<{ field: string; message: string }> = [];
  for (let i = 0; i < items.length; i++) {
    const errs = validateProductUpsert(items[i], i);
    allErrors.push(...errs);
  }

  if (allErrors.length > 0) {
    return apiValidationError(
      `Validation failed for ${allErrors.length} field(s)`,
      allErrors.slice(0, 50) // Обмежити кількість помилок у відповіді
    );
  }

  const supabase = createAdminClient();

  let created = 0;
  let updated = 0;
  const errors: Array<{ external_id: string; error: string }> = [];

  // Отримати всі existing products за external_id одним запитом
  const externalIds = items.map(p => p.external_id);
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, external_id, sku')
    .in('external_id', externalIds);

  const existingMap = new Map(
    (existingProducts || []).map(p => [p.external_id, p])
  );

  // Знайти або створити бренди
  const brandNames = [...new Set(items.filter(p => p.brand).map(p => p.brand!))];
  const brandMap = new Map<string, string>();

  if (brandNames.length > 0) {
    const { data: existingBrands } = await supabase
      .from('brands')
      .select('id, name')
      .in('name', brandNames);

    for (const b of existingBrands || []) {
      brandMap.set(b.name, b.id);
    }
  }

  // Обробити кожен товар
  for (const item of items) {
    try {
      const existing = existingMap.get(item.external_id);

      // Підготувати дані для запису
      const row: Record<string, unknown> = {
        external_id: item.external_id,
        sku: item.sku,
        name_uk: item.name,
        price: item.price_retail,
        wholesale_price: item.price_wholesale ?? null,
        quantity: item.stock_qty,
        unit: item.unit || 'шт',
        weight_g: item.weight_g ?? null,
        barcode: item.barcode ?? null,
        status: item.is_active === false ? 'disabled' : 'active',
        updated_at: new Date().toISOString(),
      };

      // Зв'язати з брендом (якщо є)
      if (item.brand && brandMap.has(item.brand)) {
        row.brand_id = brandMap.get(item.brand);
      }

      if (existing) {
        // UPDATE
        const { error } = await supabase
          .from('products')
          .update(row)
          .eq('external_id', item.external_id);

        if (error) {
          errors.push({ external_id: item.external_id, error: error.message });
        } else {
          updated++;
        }
      } else {
        // INSERT — потрібні додаткові поля
        const slug = generateSlug(item.name) + '-' + Date.now().toString(36);
        const csCartId = Math.floor(Math.random() * 900000) + 100000;

        const { error } = await supabase
          .from('products')
          .insert({
            ...row,
            slug,
            cs_cart_id: csCartId,
          });

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

  // Fire webhooks (non-blocking)
  if (created > 0 || updated > 0) {
    fireWebhook('product.updated', { created, updated, total: items.length }, ctx.tenantId).catch(() => {});
  }

  return apiSuccess({ created, updated, errors });
});

// Транслітерація для slug
function generateSlug(name: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh',
    з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
    о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
  };
  return name
    .toLowerCase()
    .split('')
    .map(c => map[c] || c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}
