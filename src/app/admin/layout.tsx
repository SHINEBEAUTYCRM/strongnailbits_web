import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBodyLock } from "@/components/admin/AdminBodyLock";
import { getAdminUser } from "@/lib/admin/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif" }}>
      <AdminBodyLock />
      <AdminShell adminUser={user}>{children}</AdminShell>
    </div>
  );
}
