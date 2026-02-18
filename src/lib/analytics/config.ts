// ================================================================
//  Analytics Config
//  Reads configuration from env vars (public keys — safe)
//  + server-side DB lookup via config-resolver
// ================================================================

import { getServiceConfig } from '@/lib/integrations/config-resolver';

export interface AnalyticsConfig {
  ga4MeasurementId: string | null;
  gtmContainerId: string | null;
  clarityProjectId: string | null;
  posthogKey: string | null;
  posthogHost: string;
  fbPixelId: string | null;
}

/** Sync getter — reads NEXT_PUBLIC_* env vars (works on client & server) */
export function getAnalyticsConfig(): AnalyticsConfig {
  return {
    ga4MeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null,
    gtmContainerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || null,
    clarityProjectId: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || null,
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || null,
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    fbPixelId: process.env.NEXT_PUBLIC_FB_PIXEL_ID || null,
  };
}

/**
 * Async getter — resolves config from DB (integration_keys) with env fallback.
 * Server-side only. Uses config-resolver caching (5 min TTL).
 */
export async function getAnalyticsConfigFromDB(): Promise<AnalyticsConfig> {
  const [ga, gtm, clarity, posthog, fb] = await Promise.all([
    getServiceConfig('google-analytics'),
    getServiceConfig('google-tag-manager'),
    getServiceConfig('microsoft-clarity'),
    getServiceConfig('posthog'),
    getServiceConfig('facebook-pixel'),
  ]);

  return {
    ga4MeasurementId: ga?.measurement_id ?? null,
    gtmContainerId: gtm?.container_id ?? null,
    clarityProjectId: clarity?.project_id ?? null,
    posthogKey: posthog?.api_key ?? null,
    posthogHost: posthog?.host || 'https://app.posthog.com',
    fbPixelId: fb?.pixel_id ?? null,
  };
}
