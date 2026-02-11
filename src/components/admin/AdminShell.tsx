"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, ExternalLink, Bell, LogOut, User, Store, X, Crown, UserCog, Loader2 } from "lucide-react";
import { adminNavigation, type NavItem } from "@/lib/admin/navigation";
import { SearchModal } from "./SearchModal";
import { DangrowBadge } from "./DangrowBadge";
import { ThemeSwitcherCompact } from "./ThemeSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useAdminTheme } from "@/lib/admin/theme";
import { createClient } from "@/lib/supabase/client";

interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

export function AdminShell({ children, adminUser }: { children: React.ReactNode; adminUser: AdminUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { theme, resolved, setTheme } = useAdminTheme();

  useEffect(() => { try { const s = localStorage.getItem("admin-sidebar-collapsed"); if (s !== null) setCollapsed(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(collapsed)); } catch {} }, [collapsed]);
  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [pathname]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); } }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, []);
  useEffect(() => { if (!userMenuOpen) return; const h = () => setUserMenuOpen(false); document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, [userMenuOpen]);

  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/admin/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const displayName = adminUser
    ? [adminUser.first_name, adminUser.last_name].filter(Boolean).join(" ") || adminUser.email.split("@")[0]
    : "Admin";
  const displayEmail = adminUser?.email || "admin@shineshop.com";
  const displayInitial = (adminUser?.first_name?.[0] || adminUser?.email?.[0] || "A").toUpperCase();
  const isAdmin = adminUser?.role === "admin";

  const breadcrumbs = (() => {
    const c: { label: string; href: string }[] = [{ label: "Dashboard", href: "/admin" }];
    if (pathname === "/admin") return c;
    const item = adminNavigation.flatMap((g) => g.items).find((i) => isActive(i.href));
    if (item) c.push({ label: item.label, href: item.href });
    if (pathname.endsWith("/new")) c.push({ label: "Новий", href: pathname });
    else if (/\/[0-9a-f-]{36}$/.test(pathname)) c.push({ label: "Редагувати", href: pathname });
    return c;
  })();

  const sidebarW = collapsed ? 72 : 260;

  return (
    <div className="h-full" data-admin-theme={resolved} style={{ ["--sw" as string]: `${sidebarW}px`, background: "var(--a-bg)", color: "var(--a-text)" }}>
      {mobileOpen && <div className="fixed inset-0 z-[40] lg:hidden" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 z-[50] flex flex-col transition-all duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ width: mobileOpen ? 260 : sidebarW, background: "var(--a-bg-sidebar)", borderRight: "1px solid var(--a-border)" }}>

        <div className="h-16 flex items-center px-5 shrink-0" style={{ borderBottom: "1px solid var(--a-border)" }}>
          {!collapsed || mobileOpen ? (
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-wider" style={{ color: "var(--a-accent)" }}>ShineShop</span>
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-4)" }}>OS</span>
            </Link>
          ) : (
            <Link href="/admin" className="w-full flex justify-center"><span className="text-lg font-bold" style={{ color: "var(--a-accent)" }}>S</span></Link>
          )}
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden" style={{ color: "var(--a-text-3)" }}><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {adminNavigation.map((group) => (
            <div key={group.label} className="mb-5">
              {(!collapsed || mobileOpen) && <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--a-text-5)" }}>{group.label}</p>}
              <div className="space-y-0.5">{group.items.map((item) => <SidebarItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed && !mobileOpen} resolved={resolved} />)}</div>
            </div>
          ))}
        </nav>

        <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--a-border)" }}>
          {/* Theme switcher in sidebar */}
          {(!collapsed || mobileOpen) && (
            <div className="mb-3 px-1">
              <ThemeSwitcher theme={theme} onChange={setTheme} />
            </div>
          )}

          {!collapsed || mobileOpen ? (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: isAdmin ? "var(--a-accent-btn)" : "#1e3a5f" }}>
                {displayInitial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: "var(--a-text-name)" }}>
                  {displayName}
                  {isAdmin ? <Crown className="w-3 h-3 shrink-0" style={{ color: "var(--a-accent)" }} /> : <UserCog className="w-3 h-3 shrink-0" style={{ color: "#60a5fa" }} />}
                </p>
                <p className="text-[11px] truncate" style={{ color: "var(--a-text-4)" }}>{displayEmail}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: isAdmin ? "var(--a-accent-btn)" : "#1e3a5f" }}>
                {displayInitial}
              </div>
            </div>
          )}
          {(!collapsed || mobileOpen) && (
            <div className="flex justify-center pb-1"><DangrowBadge compact /></div>
          )}
        </div>
      </aside>

      {/* Content */}
      <div className="lg:ml-[var(--sw)] transition-[margin] duration-200 h-full flex flex-col">
        <header className="shrink-0 h-16 flex items-center gap-4 px-4 lg:px-6" style={{ background: "var(--a-bg-header)", borderBottom: "1px solid var(--a-border)" }}>
          <button onClick={() => setMobileOpen(true)} className="lg:hidden" style={{ color: "var(--a-text-2)" }}><Menu className="w-5 h-5" /></button>
          <div className="hidden lg:flex items-center gap-2 text-sm">
            {breadcrumbs.map((cr, i) => (
              <span key={cr.href} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: "var(--a-text-6)" }}>/</span>}
                {i === breadcrumbs.length - 1 ? <span style={{ color: "var(--a-text-2)" }}>{cr.label}</span> : <Link href={cr.href} style={{ color: "var(--a-text-4)" }}>{cr.label}</Link>}
              </span>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text-3)" }}>
            <Search className="w-4 h-4" /><span className="hidden sm:inline">Пошук...</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-mono ml-2" style={{ background: "var(--a-bg-muted)", color: "var(--a-text-4)" }}>⌘K</kbd>
          </button>
          {/* Theme toggle (compact) — visible when sidebar collapsed */}
          <ThemeSwitcherCompact theme={theme} onChange={setTheme} />
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1.5 text-sm" style={{ color: "var(--a-text-3)" }}><ExternalLink className="w-4 h-4" /><span className="hidden md:inline">Магазин</span></a>
          <button className="relative" style={{ color: "var(--a-text-3)" }}><Bell className="w-5 h-5" /></button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: isAdmin ? "var(--a-accent-btn)" : "#1e3a5f" }}>
              {displayInitial}
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl overflow-hidden z-[60]" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--a-border)" }}>
                  <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--a-text-name)" }}>
                    {displayName}
                    {isAdmin
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ color: "var(--a-accent)", background: "var(--a-accent-bg)" }}>admin</span>
                      : <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ color: "#60a5fa", background: "#172554" }}>manager</span>
                    }
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>{displayEmail}</p>
                </div>
                <div className="p-1.5">
                  <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors" style={{ color: "var(--a-text-2)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--a-bg-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <User className="w-4 h-4" /> Користувачі
                  </Link>
                  <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors" style={{ color: "var(--a-text-2)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--a-bg-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <Store className="w-4 h-4" /> Магазин
                  </a>
                  <button onClick={handleLogout} disabled={loggingOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors" style={{ color: "#ef4444" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = resolved === "light" ? "#fef2f2" : "#1c1017"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Вийти
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="admin-content flex-1 overflow-y-auto p-4 lg:p-6" style={{ background: "var(--a-bg)" }}><div className="max-w-[1400px] mx-auto">{children}</div></main>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function SidebarItem({ item, active, collapsed, resolved }: { item: NavItem; active: boolean; collapsed: boolean; resolved: "dark" | "light" }) {
  const Icon = item.icon;

  if (item.soon) {
    return (
      <div className={`relative flex items-center gap-3 rounded-lg cursor-default ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"}`}
        style={{ opacity: 0.35 }} title={collapsed ? `${item.label} (скоро)` : undefined}>
        <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: "var(--a-text-5)" }} />
        {!collapsed && (
          <>
            <span className="text-sm font-medium truncate" style={{ color: "var(--a-text-5)" }}>{item.label}</span>
            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ color: "var(--a-text-5)", background: "var(--a-bg-hover)" }}>скоро</span>
          </>
        )}
        {collapsed && <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-[60]" style={{ background: "var(--a-border)", border: "1px solid var(--a-text-6)", color: "var(--a-text-4)" }}>{item.label} (скоро)</div>}
      </div>
    );
  }

  return (
    <Link href={item.href} className={`group relative flex items-center gap-3 rounded-lg transition-all duration-150 ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"}`}
      style={{ background: active ? "var(--a-bg-active)" : "transparent", color: active ? "var(--a-text)" : "var(--a-text-2)" }} title={collapsed ? item.label : undefined}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--a-bg-hover)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: "var(--a-accent)" }} />}
      <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: active ? "var(--a-accent)" : "var(--a-text-3)" }} />
      {!collapsed && <><span className="text-sm font-medium truncate">{item.label}</span>{item.badge !== undefined && <span className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: "var(--a-accent-btn)" }}>{item.badge}</span>}</>}
      {collapsed && item.badge !== undefined && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ background: "var(--a-accent-btn)" }}>{item.badge}</span>}
      {collapsed && <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-[60]" style={{ background: "var(--a-border)", border: "1px solid var(--a-text-6)", color: "var(--a-text-body)" }}>{item.label}</div>}
    </Link>
  );
}
