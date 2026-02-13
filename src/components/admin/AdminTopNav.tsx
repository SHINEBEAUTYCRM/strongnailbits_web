"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, Bell, ChevronDown } from "lucide-react";
import { adminNavigation, type NavSection } from "@/lib/admin/navigation";
import { AdminNavDropdown } from "./AdminNavDropdown";
import { AdminProfileDropdown } from "./AdminProfileDropdown";
import { ThemeSwitcherCompact } from "./ThemeSwitcher";
import type { AdminTheme } from "@/lib/admin/theme";

interface AdminTopNavProps {
  onMobileOpen: () => void;
  onSearchOpen: () => void;
  displayName: string;
  displayEmail: string;
  displayInitial: string;
  isAdmin: boolean;
  loggingOut: boolean;
  onLogout: () => void;
  theme: AdminTheme;
  onThemeChange: (t: AdminTheme) => void;
}

export function AdminTopNav({
  onMobileOpen,
  onSearchOpen,
  displayName,
  displayEmail,
  displayInitial,
  isAdmin,
  loggingOut,
  onLogout,
  theme,
  onThemeChange,
}: AdminTopNavProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on navigation
  useEffect(() => {
    setOpenDropdown(null);
    setProfileOpen(false);
  }, [pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  // Close dropdown on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDropdown(null);
        setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const isChildActive = useCallback(
    (href: string) => {
      const clean = href.split("?")[0];
      if (clean === "/admin") return pathname === "/admin";
      return pathname === clean || pathname.startsWith(clean + "/");
    },
    [pathname]
  );

  const isSectionActive = useCallback(
    (section: NavSection) => section.children.some((c) => !c.badge && isChildActive(c.href)),
    [isChildActive]
  );

  const handleMouseEnter = (id: string) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenDropdown(id);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  };

  return (
    <header
      className="shrink-0 flex items-center sticky top-0 z-50"
      style={{
        height: 56,
        background: "rgba(8, 8, 12, 0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Mobile: hamburger */}
      <button
        onClick={onMobileOpen}
        className="lg:hidden flex items-center justify-center w-12 h-14 shrink-0"
        style={{ color: "#888" }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <Link
        href="/admin"
        className="flex items-center gap-2 px-4 lg:px-5 shrink-0"
      >
        <span
          className="text-lg font-bold tracking-wider"
          style={{ color: "#a855f7", fontFamily: "var(--font-outfit, 'Outfit'), sans-serif" }}
        >
          ShineShop
        </span>
        <span
          className="text-[11px] font-medium uppercase tracking-wider hidden sm:inline"
          style={{ color: "#555" }}
        >
          OS
        </span>
      </Link>

      {/* Desktop nav items */}
      <nav ref={navRef} className="hidden lg:flex items-center h-full flex-1 min-w-0">
        {adminNavigation.map((section) => {
          const Icon = section.icon;
          const active = isSectionActive(section);
          const isOpen = openDropdown === section.id;
          const isSoon = !!section.badge;

          if (isSoon) {
            return (
              <div
                key={section.id}
                className="relative flex items-center gap-1 h-full shrink-0"
                style={{
                  padding: "0 10px",
                  color: "#444",
                  fontSize: 13,
                  fontFamily: "var(--font-outfit, 'Outfit'), sans-serif",
                  cursor: "default",
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: "#555",
                    background: "rgba(255,255,255,0.04)",
                    padding: "1px 5px",
                    borderRadius: 4,
                    marginLeft: 2,
                  }}
                >
                  {section.badge}
                </span>
              </div>
            );
          }

          return (
            <div
              key={section.id}
              className="relative flex items-center h-full shrink-0"
              onMouseEnter={() => handleMouseEnter(section.id)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className="flex items-center gap-1 h-full transition-colors duration-150"
                style={{
                  padding: "0 10px",
                  color: active ? "#a855f7" : isOpen ? "#fff" : "#888",
                  fontSize: 13,
                  fontFamily: "var(--font-outfit, 'Outfit'), sans-serif",
                  cursor: "pointer",
                  background: "transparent",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: `2px solid ${active ? "#a855f7" : "transparent"}`,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  if (!active && !isOpen) e.currentTarget.style.color = "#888";
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
                <ChevronDown
                  className="w-3 h-3 transition-transform duration-150"
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                    opacity: 0.5,
                  }}
                />
              </button>

              {/* Dropdown */}
              {isOpen && (
                <AdminNavDropdown
                  children={section.children}
                  onNavigate={() => setOpenDropdown(null)}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 px-3 lg:px-4 shrink-0 ml-auto">
        {/* Search */}
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#888",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            e.currentTarget.style.color = "#ccc";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "#888";
          }}
        >
          <Search className="w-4 h-4" />
          <kbd
            className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: "rgba(255,255,255,0.04)", color: "#555" }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Theme toggle */}
        <ThemeSwitcherCompact theme={theme} onChange={onThemeChange} />

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ color: "#888" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#ccc"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; }}
        >
          <Bell className="w-[18px] h-[18px]" />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-shadow"
            style={{
              background: isAdmin ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#1e3a5f",
              boxShadow: profileOpen ? "0 0 0 2px rgba(168,85,247,0.3)" : "none",
            }}
          >
            {displayInitial}
          </button>
          <AdminProfileDropdown
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            displayName={displayName}
            displayEmail={displayEmail}
            displayInitial={displayInitial}
            isAdmin={isAdmin}
            loggingOut={loggingOut}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
}
