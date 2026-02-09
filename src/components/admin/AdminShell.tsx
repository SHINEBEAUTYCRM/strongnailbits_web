"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Menu, Search, ExternalLink, Bell, LogOut, User, Store, X } from "lucide-react";
import { adminNavigation, type NavItem } from "@/lib/admin/navigation";
import { SearchModal } from "./SearchModal";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => { try { const s = localStorage.getItem("admin-sidebar-collapsed"); if (s !== null) setCollapsed(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(collapsed)); } catch {} }, [collapsed]);
  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [pathname]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); } }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, []);
  useEffect(() => { if (!userMenuOpen) return; const h = () => setUserMenuOpen(false); document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, [userMenuOpen]);

  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const breadcrumbs = (() => {
    const c: { label: string; href: string }[] = [{ label: "Dashboard", href: "/admin" }];
    if (pathname !== "/admin") { const item = adminNavigation.flatMap((g) => g.items).find((i) => isActive(i.href)); if (item) c.push({ label: item.label, href: item.href }); }
    return c;
  })();

  const sidebarW = collapsed ? 72 : 260;

  return (
    <div className="h-full" style={{ ["--sw" as string]: `${sidebarW}px` }}>
      {mobileOpen && <div className="fixed inset-0 z-[40] lg:hidden" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 z-[50] flex flex-col transition-all duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ width: mobileOpen ? 260 : sidebarW, background: "#0c0c12", borderRight: "1px solid #1e1e2a" }}>

        <div className="h-16 flex items-center px-5 shrink-0" style={{ borderBottom: "1px solid #1e1e2a" }}>
          {!collapsed || mobileOpen ? (
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-wider" style={{ color: "#a855f7" }}>ShineShop</span>
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#52525b" }}>OS</span>
            </Link>
          ) : (
            <Link href="/admin" className="w-full flex justify-center"><span className="text-lg font-bold" style={{ color: "#a855f7" }}>S</span></Link>
          )}
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden" style={{ color: "#71717a" }}><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {adminNavigation.map((group) => (
            <div key={group.label} className="mb-5">
              {(!collapsed || mobileOpen) && <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "#3f3f46" }}>{group.label}</p>}
              <div className="space-y-0.5">{group.items.map((item) => <SidebarItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed && !mobileOpen} />)}</div>
            </div>
          ))}
        </nav>

        <div className="p-3 shrink-0" style={{ borderTop: "1px solid #1e1e2a" }}>
          {!collapsed || mobileOpen ? (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "#7c3aed" }}>A</div>
              <div className="min-w-0"><p className="text-sm font-medium truncate" style={{ color: "#d4d4d8" }}>Admin</p><p className="text-[11px]" style={{ color: "#52525b" }}>admin</p></div>
            </div>
          ) : (
            <div className="flex justify-center py-2 mb-2"><div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#7c3aed" }}>A</div></div>
          )}
          {(!collapsed || mobileOpen) && (
            <p className="text-center text-[10px] tracking-wider pb-1" style={{ color: "#27272a" }}>powered by <span style={{ color: "#3f3f46" }}>DANGROW</span></p>
          )}
        </div>
      </aside>

      {/* Content */}
      <div className="lg:ml-[var(--sw)] transition-[margin] duration-200 h-full flex flex-col">
        <header className="shrink-0 h-16 flex items-center gap-4 px-4 lg:px-6" style={{ background: "#0a0a10", borderBottom: "1px solid #1e1e2a" }}>
          <button onClick={() => setMobileOpen(true)} className="lg:hidden" style={{ color: "#a1a1aa" }}><Menu className="w-5 h-5" /></button>
          <div className="hidden lg:flex items-center gap-2 text-sm">
            {breadcrumbs.map((cr, i) => (
              <span key={cr.href} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: "#27272a" }}>/</span>}
                {i === breadcrumbs.length - 1 ? <span style={{ color: "#a1a1aa" }}>{cr.label}</span> : <Link href={cr.href} style={{ color: "#52525b" }}>{cr.label}</Link>}
              </span>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#141418", border: "1px solid #1e1e2a", color: "#71717a" }}>
            <Search className="w-4 h-4" /><span className="hidden sm:inline">Пошук...</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-mono ml-2" style={{ background: "#1a1a24", color: "#52525b" }}>⌘K</kbd>
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1.5 text-sm" style={{ color: "#71717a" }}><ExternalLink className="w-4 h-4" /><span className="hidden md:inline">Магазин</span></a>
          <button className="relative" style={{ color: "#71717a" }}><Bell className="w-5 h-5" /><span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: "#7c3aed" }}>3</span></button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#7c3aed" }}>A</button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl overflow-hidden z-[60]" style={{ background: "#111116", border: "1px solid #1e1e2a" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e2a" }}><p className="text-sm" style={{ color: "#d4d4d8" }}>Admin</p><p className="text-xs mt-0.5" style={{ color: "#52525b" }}>admin@shineshop.com</p></div>
                <div className="p-1.5">
                  <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm" style={{ color: "#a1a1aa" }}><User className="w-4 h-4" /> Профіль</Link>
                  <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm" style={{ color: "#a1a1aa" }}><Store className="w-4 h-4" /> Магазин</a>
                  <Link href="/admin/login" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm" style={{ color: "#ef4444" }}><LogOut className="w-4 h-4" /> Вийти</Link>
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ background: "#08080c" }}><div className="max-w-[1400px] mx-auto">{children}</div></main>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function SidebarItem({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`group relative flex items-center gap-3 rounded-lg transition-colors duration-150 ${collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"}`}
      style={{ background: active ? "#18182a" : "transparent", color: active ? "#f4f4f5" : "#a1a1aa" }} title={collapsed ? item.label : undefined}>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: "#a855f7" }} />}
      <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: active ? "#a855f7" : "#71717a" }} />
      {!collapsed && <><span className="text-sm font-medium truncate">{item.label}</span>{item.badge !== undefined && <span className="ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: "#7c3aed" }}>{item.badge}</span>}</>}
      {collapsed && item.badge !== undefined && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ background: "#7c3aed" }}>{item.badge}</span>}
      {collapsed && <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-[60]" style={{ background: "#1e1e2a", border: "1px solid #27272a", color: "#e4e4e7" }}>{item.label}</div>}
    </Link>
  );
}
