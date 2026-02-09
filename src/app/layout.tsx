import type { Metadata } from "next";
import { Unbounded, Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
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
