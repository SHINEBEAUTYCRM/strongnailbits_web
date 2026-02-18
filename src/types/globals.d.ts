/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Global window extensions for third-party analytics scripts.
 * Injected at runtime by GTM, GA4, FB Pixel, Clarity, PostHog.
 */
declare global {
  interface Window {
    gtag?: (...args: [string, ...unknown[]]) => void;
    fbq?: (...args: [string, ...unknown[]]) => void;
    posthog?: {
      capture: (event: string, props?: Record<string, unknown>) => void;
      identify: (id: string, props?: Record<string, unknown>) => void;
      reset: () => void;
    };
    clarity?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

export {};
