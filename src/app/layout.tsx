import type { Metadata, Viewport } from "next";
import { Unbounded, Inter, JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const ToastContainer = dynamic(
  () => import("@/components/ui/Toast").then((m) => m.ToastContainer),
  { ssr: false },
);

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
    process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2bcomua.vercel.app",
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
  return (
    <html lang="uk">
      <head>
        <link rel="dns-prefetch" href="https://kqgtxmdruxwtocmvsvwh.supabase.co" />
        <link rel="preconnect" href="https://kqgtxmdruxwtocmvsvwh.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://shine-shop.com.ua" />
      </head>
      <body
        className={`${unbounded.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Header />
        <main className="min-h-[calc(100dvh-80px)]">{children}</main>
        <Footer />
        <ToastContainer />
      </body>
    </html>
  );
}
