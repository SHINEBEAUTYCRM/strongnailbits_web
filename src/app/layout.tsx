import type { Metadata, Viewport } from "next";
import { Unbounded, Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import { ValentineHearts } from "@/components/ui/ValentineHearts";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { SiteTracker } from "@/components/analytics/SiteTracker";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SHINE SHOP — Професійна nail-косметика",
    template: "%s | SHINE SHOP",
  },
  description:
    "Професійна косметика для nail-майстрів. Гель-лаки, бази, топи, інструменти. Оптові ціни від 1-ї одиниці. Доставка по Україні.",
  keywords: [
    "гель-лак оптом",
    "nail косметика",
    "B2B краса",
    "Shine Shop",
    "манікюр",
    "професійна косметика",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com",
  ),
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: "SHINE SHOP",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analytics = getAnalyticsConfig();

  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        {/* Admin theme flash prevention — sets data-admin-theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('admin-theme')||'dark';var r=t;if(t==='auto'){r=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-admin-theme',r)}catch(e){}})();`,
          }}
        />
        {/* Preconnect to critical origins (saves DNS+TCP+TLS per origin) */}
        <link rel="preconnect" href="https://kqgtxmdruxwtocmvsvwh.supabase.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://shine-shop.com.ua" crossOrigin="anonymous" />
        {/* DNS prefetch for analytics (non-critical, loaded later) */}
        {analytics.gtmContainerId && (
          <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        )}
        {analytics.ga4MeasurementId && !analytics.gtmContainerId && (
          <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        )}
        {analytics.clarityProjectId && (
          <link rel="dns-prefetch" href="https://www.clarity.ms" />
        )}
        {analytics.fbPixelId && (
          <link rel="dns-prefetch" href="https://connect.facebook.net" />
        )}
      </head>
      <body
        className={`${unbounded.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {/* GTM noscript fallback */}
        {analytics.gtmContainerId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${analytics.gtmContainerId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <AnalyticsProvider
          ga4Id={analytics.ga4MeasurementId}
          gtmId={analytics.gtmContainerId}
          clarityId={analytics.clarityProjectId}
          posthogKey={analytics.posthogKey}
          posthogHost={analytics.posthogHost}
          fbPixelId={analytics.fbPixelId}
        />
        <SiteTracker />
        <Header />
        <main className="min-h-[calc(100dvh-80px)]">{children}</main>
        <Footer />
        <ValentineHearts />
        <ToastContainer />
      </body>
    </html>
  );
}
