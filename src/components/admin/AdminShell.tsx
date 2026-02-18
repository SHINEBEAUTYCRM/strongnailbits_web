"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminTopNav } from "./AdminTopNav";
import { AdminMobileMenu } from "./AdminMobileMenu";
import { SearchModal } from "./SearchModal";
import { TaskCreateModal } from "./tasks/TaskCreateModal";
import { useAdminTheme } from "@/lib/admin/theme";
import type { AdminUser } from "@/lib/admin/auth";

export function AdminShell({ children, adminUser }: { children: React.ReactNode; adminUser: AdminUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { theme, resolved, setTheme } = useAdminTheme();

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ⌘K shortcut + 'C' to open task create
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      // 'C' key — open task create (only if not in input/textarea)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !isInput && !searchOpen && !createTaskOpen) {
        e.preventDefault();
        setCreateTaskOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchOpen, createTaskOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (err) {
      console.error('[AdminShell] Logout failed:', err);
      setLoggingOut(false);
    }
  };

  const displayName = adminUser?.name || "Admin";
  const displayPhone = adminUser?.phone || "";
  const displayInitial = (adminUser?.name?.[0] || "A").toUpperCase();
  const isAdmin = adminUser?.role === "ceo" || adminUser?.role === "admin";

  return (
    <div
      className="h-full flex flex-col"
      data-admin-theme={resolved}
      style={{ background: "var(--a-bg)", color: "var(--a-text)" }}
    >
      {/* Top Navigation */}
      <AdminTopNav
        onMobileOpen={() => setMobileOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        onNewTask={() => setCreateTaskOpen(true)}
        displayName={displayName}
        displayEmail={displayPhone}
        displayInitial={displayInitial}
        isAdmin={isAdmin}
        loggingOut={loggingOut}
        onLogout={handleLogout}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Main content — full width */}
      <main
        className="admin-content flex-1 overflow-y-auto p-4 lg:p-6"
        style={{ background: "var(--a-bg)" }}
      >
        <div className="max-w-[1400px] mx-auto">{children}</div>
      </main>

      {/* Mobile menu overlay */}
      <AdminMobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        displayName={displayName}
        displayEmail={displayPhone}
      />

      {/* Search modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Task create modal (global) */}
      <TaskCreateModal open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} />
    </div>
  );
}
