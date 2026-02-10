"use client";

// ================================================================
//  AnalyticsProvider
//  Загружает все скрипты аналитики: GA4, GTM, Clarity, PostHog, FB Pixel
//  Читает конфиг из env vars (NEXT_PUBLIC_*)
// ================================================================

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface AnalyticsProviderProps {
  ga4Id?: string | null;
  gtmId?: string | null;
  clarityId?: string | null;
  posthogKey?: string | null;
  posthogHost?: string;
  fbPixelId?: string | null;
}

export function AnalyticsProvider({
  ga4Id,
  gtmId,
  clarityId,
  posthogKey,
  posthogHost = "https://app.posthog.com",
  fbPixelId,
}: AnalyticsProviderProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Трекинг SPA навигации
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    const url = window.location.href;

    // GA4 pageview
    if (ga4Id && (window as any).gtag) {
      (window as any).gtag("event", "page_view", {
        page_location: url,
        page_path: pathname,
      });
    }

    // FB Pixel pageview
    if (fbPixelId && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }

    // PostHog pageview
    if (posthogKey && (window as any).posthog) {
      (window as any).posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, ga4Id, fbPixelId, posthogKey]);

  // Не загружаем аналитику в админке
  if (pathname?.startsWith("/admin")) return null;

  const hasAny = ga4Id || gtmId || clarityId || posthogKey || fbPixelId;
  if (!hasAny) return null;

  return (
    <>
      {/* ---------------------------------------------------------- */}
      {/*  Google Tag Manager (если есть — управляет всеми тегами)   */}
      {/* ---------------------------------------------------------- */}
      {gtmId && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `,
            }}
          />
          {/* GTM noscript — вставляется через layout.tsx в <body> */}
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {/*  Google Analytics 4 (standalone, если нет GTM)             */}
      {/* ---------------------------------------------------------- */}
      {ga4Id && !gtmId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga4Id}', {
                  page_path: window.location.pathname,
                  send_page_view: true,
                  currency: 'UAH'
                });
              `,
            }}
          />
        </>
      )}

      {/* Если GTM есть, всё равно нужен gtag для e-commerce событий */}
      {ga4Id && gtmId && (
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}', { send_page_view: false, currency: 'UAH' });
            `,
          }}
        />
      )}

      {/* ---------------------------------------------------------- */}
      {/*  Microsoft Clarity (deferred — not critical for UX)        */}
      {/* ---------------------------------------------------------- */}
      {clarityId && (
        <Script
          id="clarity-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window,document,"clarity","script","${clarityId}");
            `,
          }}
        />
      )}

      {/* ---------------------------------------------------------- */}
      {/*  PostHog (deferred — not critical for UX)                  */}
      {/* ---------------------------------------------------------- */}
      {posthogKey && (
        <Script
          id="posthog-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onFeatureFlags onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
              posthog.init('${posthogKey}', {
                api_host: '${posthogHost}',
                person_profiles: 'identified_only',
                capture_pageview: false,
                capture_pageleave: true,
                autocapture: true
              });
            `,
          }}
        />
      )}

      {/* ---------------------------------------------------------- */}
      {/*  Facebook Pixel (deferred — not critical for UX)           */}
      {/* ---------------------------------------------------------- */}
      {fbPixelId && (
        <Script
          id="fb-pixel-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${fbPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
    </>
  );
}
