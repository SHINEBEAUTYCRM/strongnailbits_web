// ================================================================
//  Analytics Config
//  Читает конфигурацию из env vars (public keys — безопасно)
// ================================================================

export interface AnalyticsConfig {
  ga4MeasurementId: string | null;
  gtmContainerId: string | null;
  clarityProjectId: string | null;
  posthogKey: string | null;
  posthogHost: string;
  fbPixelId: string | null;
}

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
