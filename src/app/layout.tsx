import type { Metadata, Viewport } from "next";
import { Unbounded, Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ValentineHearts } from "@/components/ui/ValentineHearts";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { SiteTracker } from "@/components/analytics/SiteTracker";
import { TopBarWrapper } from "@/components/layout/TopBarWrapper";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { getSiteSettings } from "@/lib/site-settings";
import type { SiteContacts, SiteSocial } from "@/lib/site-settings";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analytics = getAnalyticsConfig();

  /* Fetch site settings from DB (cached 60s, graceful fallback) */
  let cssVars = "";
  let contacts: SiteContacts | null = null;
  let social: SiteSocial | null = null;
  let footerData: Record<string, unknown> | null = null;

  try {
    const settings = await getSiteSettings();
    if (settings?.theme?.colors) {
      const c = settings.theme.colors;
      cssVars = `:root{--bg:${c.bg || "#f5f5f7"};--bg2:${c.bg2 || "#e8e8e8"};--card:${c.card || "#FFFFFF"};--coral:${c.coral || "#D6264A"};--coral2:${c.coral2 || "#B8203F"};--violet:${c.violet || "#8B5CF6"};--dark:${c.dark || "#1a1a1a"};--t:${c.text_primary || "#1a1a1a"};--t2:${c.text_secondary || "#6b6b7b"};--t3:${c.text_muted || c.text_secondary || "#6e6e7a"};--green:${c.green || "#008040"};--amber:${c.amber || "#C27400"};--red:${c.red || "#E0352B"};--border:${c.border || "#f0f0f0"}}`;
    }
    contacts = settings?.contacts ?? null;
    social = settings?.social ?? null;
    footerData = (settings?.footer ?? null) as Record<string, unknown> | null;
  } catch {
    /* Table may not exist yet — use CSS fallback from globals.css */
  }

  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        {/* Admin theme flash prevention — sets data-admin-theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('admin-theme')||'dark';var r=t;if(t==='auto'){r=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-admin-theme',r)}catch(e){}})();`,
          }}
        />
        {/* Theme CSS variables from DB (overrides globals.css fallback) */}
        {cssVars && (
          <style dangerouslySetInnerHTML={{ __html: cssVars }} />
        )}
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
        <TopBarWrapper />
        <Header contacts={contacts} />
        <main className="min-h-[calc(100dvh-80px)]">{children}</main>
        <Footer contacts={contacts} social={social} footer={footerData} />
        <MobileBottomNav />
        <ValentineHearts />
        <ToastContainer />
      </body>
    </html>
  );
}
