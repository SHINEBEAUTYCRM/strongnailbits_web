// ================================================================
//  API: /api/integrations/status
//  Статус всіх інтеграцій
// ================================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from '@/lib/integrations/base';
import { SERVICE_REGISTRY } from '@/lib/integrations/registry';
import type { IntegrationKeyRow, IntegrationStatusItem } from '@/lib/integrations/types';

/**
 * GET /api/integrations/status
 * Повертає статус кожного з 47 сервісів:
 * - isActive, isVerified, hasConfig, errorMessage
 */
export async function GET() {
  try {
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('integration_keys')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Створити map slug → row
    const keyMap = new Map<string, IntegrationKeyRow>();
    for (const row of (data || []) as IntegrationKeyRow[]) {
      keyMap.set(row.service_slug, row);
    }

    // Побудувати статуси для всіх 47 сервісів
    const statuses: IntegrationStatusItem[] = SERVICE_REGISTRY.map(service => {
      const row = keyMap.get(service.slug);

      return {
        slug: service.slug,
        name: service.name,
        category: service.category,
        isActive: row?.is_active ?? false,
        isVerified: row?.is_verified ?? false,
        verifiedAt: row?.verified_at ?? null,
        errorMessage: row?.error_message ?? null,
        hasConfig: row ? Object.keys(row.config).length > 0 : false,
      };
    });

    // Статистика
    const stats = {
      total: statuses.length,
      active: statuses.filter(s => s.isActive).length,
      verified: statuses.filter(s => s.isVerified).length,
      withErrors: statuses.filter(s => s.errorMessage).length,
    };

    return NextResponse.json({ data: statuses, stats });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
