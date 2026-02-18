// ================================================================
//  POST /api/v1/documents — Завантажити накладні/реалізації з 1С
//  Permission: documents:write
// ================================================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';
import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess, apiValidationError } from '@/lib/api/helpers';
import { validateDocument, validateArray } from '@/lib/api/validators';
import type { DocumentInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export const POST = withApiAuth('documents:write', async (req: NextRequest, ctx) => {
  const body = await req.json();

  // Валідація масиву
  const { items, error: arrayError } = validateArray<DocumentInput>(body, 100, 'documents');
  if (arrayError || !items) {
    return apiValidationError(arrayError || 'Invalid input');
  }

  // Валідація кожного елемента
  const allErrors: Array<{ field: string; message: string }> = [];
  for (let i = 0; i < items.length; i++) {
    const errs = validateDocument(items[i], i);
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
  const errors: Array<{ external_id: string; error: string }> = [];

  // Отримати існуючі документи за external_id
  const externalIds = items.map(d => d.external_id);
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('id, external_id')
    .eq('tenant_id', tenantId)
    .in('external_id', externalIds);

  const existingMap = new Map(
    (existingDocs || []).map(d => [d.external_id, d])
  );

  // Знайти profile_id за customer_external_id
  const customerExternalIds = [...new Set(items.map(d => d.customer_external_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, external_id')
    .in('external_id', customerExternalIds);

  const profileMap = new Map(
    (profiles || []).map(p => [p.external_id, p.id])
  );

  for (const item of items) {
    try {
      const existing = existingMap.get(item.external_id);
      const profileId = profileMap.get(item.customer_external_id) || null;

      const row: Record<string, unknown> = {
        tenant_id: tenantId,
        external_id: item.external_id,
        customer_external_id: item.customer_external_id,
        profile_id: profileId,
        doc_type: item.doc_type,
        doc_number: item.doc_number,
        doc_date: item.doc_date,
        total_amount: item.total_amount,
        discount_amount: item.discount_amount || 0,
        payment_status: item.payment_status || 'pending',
        ttn_number: item.ttn_number || null,
        items: item.items,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from('documents')
          .update(row)
          .eq('id', existing.id);

        if (error) {
          errors.push({ external_id: item.external_id, error: error.message });
        } else {
          updated++;
        }
      } else {
        const { error } = await supabase
          .from('documents')
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
