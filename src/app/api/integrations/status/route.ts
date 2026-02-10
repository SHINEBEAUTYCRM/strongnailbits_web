// ================================================================
//  API: /api/integrations/status
//  Статус всіх інтеграцій (DB + ENV fallback)
// ================================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SERVICE_REGISTRY } from '@/lib/integrations/registry';
import type { IntegrationKeyRow, IntegrationStatusItem } from '@/lib/integrations/types';

// ── Маппінг slug → env var для автоматичного визначення статусу ──
const ENV_VAR_MAP: Record<string, string> = {
  'ga4':       'NEXT_PUBLIC_GA_MEASUREMENT_ID',
  'gtm':       'NEXT_PUBLIC_GTM_CONTAINER_ID',
  'clarity':   'NEXT_PUBLIC_CLARITY_PROJECT_ID',
  'posthog':   'NEXT_PUBLIC_POSTHOG_KEY',
  'fb-pixel':  'NEXT_PUBLIC_FB_PIXEL_ID',
  'fb-capi':   'FB_CAPI_ACCESS_TOKEN',
  'supabase':  'NEXT_PUBLIC_SUPABASE_URL',
  'cs-cart':   'CS_CART_API_URL',
};

function getEnvStatus(slug: string): { isActive: boolean; source: string } | null {
  const envKey = ENV_VAR_MAP[slug];
  if (!envKey) return null;
  const value = process.env[envKey];
  if (value && value.trim().length > 0) {
    return { isActive: true, source: 'env' };
  }
  return null;
}

/**
 * GET /api/integrations/status
 * Повертає статус кожного з 47 сервісів.
 * Перевіряє: 1) DB (integration_keys), 2) ENV vars як fallback
 */
export async function GET() {
  try {
    // Спробувати прочитати з БД (може не існувати)
    const keyMap = new Map<string, IntegrationKeyRow>();
    let dbAvailable = false;

    try {
      const supabase = createAdminClient();
      const { data: tenantData } = await supabase
        .from('tenant_settings')
        .select('id')
        .limit(1)
        .single();

      if (tenantData?.id) {
        const { data } = await supabase
          .from('integration_keys')
          .select('*')
          .eq('tenant_id', tenantData.id);

        for (const row of (data || []) as IntegrationKeyRow[]) {
          keyMap.set(row.service_slug, row);
        }
        dbAvailable = true;
      }
    } catch {
      // DB таблиці ще не створені — це ОК, використаємо env vars
    }

    // Побудувати статуси для всіх сервісів
    const statuses: IntegrationStatusItem[] = SERVICE_REGISTRY.map(service => {
      const row = keyMap.get(service.slug);
      const envStatus = getEnvStatus(service.slug);

      // DB має пріоритет, якщо є
      if (row) {
        return {
          slug: service.slug,
          name: service.name,
          category: service.category,
          isActive: row.is_active ?? false,
          isVerified: row.is_verified ?? false,
          verifiedAt: row.verified_at ?? null,
          errorMessage: row.error_message ?? null,
          hasConfig: Object.keys(row.config).length > 0,
          source: 'db' as const,
        };
      }

      // Fallback: env var
      if (envStatus?.isActive) {
        return {
          slug: service.slug,
          name: service.name,
          category: service.category,
          isActive: true,
          isVerified: true,
          verifiedAt: null,
          errorMessage: null,
          hasConfig: true,
          source: 'env' as const,
        };
      }

      // Не налаштовано
      return {
        slug: service.slug,
        name: service.name,
        category: service.category,
        isActive: false,
        isVerified: false,
        verifiedAt: null,
        errorMessage: null,
        hasConfig: false,
        source: null,
      };
    });

    // Статистика
    const stats = {
      total: statuses.length,
      active: statuses.filter(s => s.isActive).length,
      verified: statuses.filter(s => s.isVerified).length,
      withErrors: statuses.filter(s => s.errorMessage).length,
      dbAvailable,
    };

    return NextResponse.json({ data: statuses, stats });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
