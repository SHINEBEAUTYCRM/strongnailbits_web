import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { AdminBodyLock } from "@/components/admin/AdminBodyLock";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-admin",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SHINE ADMIN",
    template: "%s | SHINE ADMIN",
  },
  description: "Shine Shop — Панель управління",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${outfit.variable} ${jetbrainsMono.variable} fixed inset-0 z-[9999] overflow-auto`}
      style={{
        fontFamily: "var(--font-outfit), system-ui, sans-serif",
        background: "#08080c",
        color: "#ffffff",
      }}
    >
      <AdminBodyLock />
      {children}
    </div>
  );
}
