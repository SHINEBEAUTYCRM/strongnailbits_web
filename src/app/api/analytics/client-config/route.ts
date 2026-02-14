// ================================================================
//  API: /api/analytics/client-config
//  Повертає публічні ключі аналітичних сервісів із БД
//  (FB Pixel ID, GA4, GTM, Clarity, PostHog)
// ================================================================

import { NextResponse } from 'next/server';
import { getServiceConfig } from '@/lib/integrations/config-resolver';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 min ISR

export async function GET() {
  try {
    const [ga, gtm, clarity, posthog, fb] = await Promise.all([
      getServiceConfig('google-analytics'),
      getServiceConfig('google-tag-manager'),
      getServiceConfig('microsoft-clarity'),
      getServiceConfig('posthog'),
      getServiceConfig('facebook-pixel'),
    ]);

    return NextResponse.json({
      ga4MeasurementId: ga?.measurement_id ?? null,
      gtmContainerId: gtm?.container_id ?? null,
      clarityProjectId: clarity?.project_id ?? null,
      posthogKey: posthog?.api_key ?? null,
      posthogHost: posthog?.host || 'https://app.posthog.com',
      fbPixelId: fb?.pixel_id ?? null,
    });
  } catch (err) {
    console.error('[API:AnalyticsConfig] Failed:', err);
    return NextResponse.json(
      { error: 'Failed to load analytics config' },
      { status: 500 }
    );
  }
}
