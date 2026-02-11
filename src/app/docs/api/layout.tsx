import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShineShop API Documentation",
  robots: { index: false, follow: false },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0c0c12]">
      {children}
    </div>
  );
}
