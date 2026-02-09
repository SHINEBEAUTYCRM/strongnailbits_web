"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  ExternalLink,
  Bell,
  LogOut,
  User,
  Store,
  X,
} from "lucide-react";
import { adminNavigation, type NavItem } from "@/lib/admin/navigation";
import { createClient } from "@/lib/supabase/client";
import { SearchModal } from "./SearchModal";

interface AdminUser {
  email: string;
  name: string;
  role: string;
}

interface AdminShellProps {
  children: React.ReactNode;
  user: AdminUser;
}

export function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin-sidebar-collapsed");
      if (saved !== null) setCollapsed(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem(
        "admin-sidebar-collapsed",
        JSON.stringify(collapsed),
      );
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Keyboard shortcuts: Cmd+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close user menu on click outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = () => setUserMenuOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [userMenuOpen]);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  // Breadcrumbs
  const breadcrumbs = (() => {
    const crumbs: { label: string; href: string }[] = [
      { label: "Dashboard", href: "/admin" },
    ];
    if (pathname !== "/admin") {
      const allItems = adminNavigation.flatMap((g) => g.items);
      const currentItem = allItems.find((item) => isActive(item.href));
      if (currentItem) {
        crumbs.push({ label: currentItem.label, href: currentItem.href });
      }
    }
    return crumbs;
  })();

  const sidebarWidth = collapsed ? 72 : 260;
  const userInitial =
    user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase() || "A";

  return (
    <div
      style={
        { "--sidebar-w": `${sidebarWidth}px` } as React.CSSProperties
      }
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[40] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-[50]
          flex flex-col
          bg-[#0a0a0f] border-r border-white/[0.06]
          transition-all duration-200 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
        style={{ width: mobileOpen ? 260 : sidebarWidth }}
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center px-4 border-b border-white/[0.06] shrink-0">
          {!collapsed || mobileOpen ? (
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-wider">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  SHINE
                </span>{" "}
                <span className="text-white/50 text-sm">ADMIN</span>
              </span>
            </Link>
          ) : (
            <Link href="/admin" className="w-full flex justify-center">
              <span className="text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                S
              </span>
            </Link>
          )}
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-white/30 hover:text-white lg:hidden transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-none">
          {adminNavigation.map((group) => (
            <div key={group.label} className="mb-5">
              {(!collapsed || mobileOpen) && (
                <p className="px-3 mb-2 text-[10px] font-semibold text-white/20 uppercase tracking-[0.15em]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed && !mobileOpen}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-white/[0.06] p-3 shrink-0">
          {/* User info */}
          {!collapsed || mobileOpen ? (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white/80 truncate">
                  {user.name || user.email}
                </p>
                <p className="text-[11px] text-white/30 capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                {userInitial}
              </div>
            </div>
          )}

          {/* Collapse button (desktop only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-150 text-xs"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Згорнути</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ─── Content wrapper ─── */}
      <div className="lg:ml-[var(--sidebar-w)] transition-[margin] duration-200 min-h-screen">
        {/* ─── TopBar ─── */}
        <header className="sticky top-0 z-[30] h-16 flex items-center gap-4 px-4 lg:px-6 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/[0.06]">
          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-white/60 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs (desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/15">/</span>}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-white/60">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-white/30 hover:text-white/60 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/50 hover:bg-white/[0.06] transition-all duration-150 text-sm"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Пошук...</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-white/20 ml-2">
              ⌘K
            </kbd>
          </button>

          {/* Open store */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden md:inline">Магазин</span>
          </a>

          {/* Notifications */}
          <button className="relative text-white/40 hover:text-white/70 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[9px] font-bold text-white flex items-center justify-center">
              3
            </span>
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUserMenuOpen(!userMenuOpen);
              }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity"
            >
              {userInitial}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#0a0a0f] border border-white/[0.08] shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-sm text-white/80 truncate">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">{user.email}</p>
                </div>
                <div className="p-1.5">
                  <DropdownLink
                    icon={User}
                    label="Профіль"
                    href="/admin/settings"
                  />
                  <DropdownLink
                    icon={Store}
                    label="Перейти до магазину"
                    href="/"
                    external
                  />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Вийти
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ─── Main content ─── */}
        <main className="p-4 lg:p-6">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Search Modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

/* ─── Sidebar Nav Item ─── */
function SidebarItem({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`
        group relative flex items-center gap-3 rounded-lg transition-all duration-150
        ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"}
        ${
          active
            ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-white"
            : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
        }
      `}
      title={collapsed ? item.label : undefined}
    >
      {/* Active indicator */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-purple-500 to-pink-500" />
      )}

      <Icon
        className={`w-[18px] h-[18px] shrink-0 ${active ? "text-purple-400" : ""}`}
      />

      {!collapsed && (
        <>
          <span className="text-sm font-medium truncate">{item.label}</span>
          {item.badge !== undefined && (
            <span className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              {item.badge}
            </span>
          )}
        </>
      )}

      {collapsed && item.badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[8px] font-bold text-white flex items-center justify-center">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

/* ─── Dropdown Link ─── */
function DropdownLink({
  icon: Icon,
  label,
  href,
  external,
}: {
  icon: typeof User;
  label: string;
  href: string;
  external?: boolean;
}) {
  const classes =
    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        <Icon className="w-4 h-4" />
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
