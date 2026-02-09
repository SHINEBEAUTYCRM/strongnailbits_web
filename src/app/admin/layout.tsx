import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBodyLock } from "@/components/admin/AdminBodyLock";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ background: "#08080c", color: "#ffffff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Fonts for DANGROW badge */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Inter:wght@500&display=swap" />
      <AdminBodyLock />
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
