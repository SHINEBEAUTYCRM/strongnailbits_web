import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBodyLock } from "@/components/admin/AdminBodyLock";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ background: "#08080c", color: "#ffffff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <AdminBodyLock />
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
