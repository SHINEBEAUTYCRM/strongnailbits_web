"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavChild } from "@/lib/admin/navigation";

interface AdminNavDropdownProps {
  children: NavChild[];
  onNavigate: () => void;
}

export function AdminNavDropdown({ children, onNavigate }: AdminNavDropdownProps) {
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Direct DOM: if dropdown overflows right → flip to right-aligned
  useLayoutEffect(() => {
    const el = dropdownRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth - 12) {
      el.style.left = "auto";
      el.style.right = "0";
    }
  });

  const isChildActive = (href: string) => {
    const clean = href.split("?")[0];
    if (clean === "/admin") return pathname === "/admin";
    return pathname === clean || pathname.startsWith(clean + "/");
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 55,
        marginTop: 0,
        background: "var(--a-bg-card)",
        border: "1px solid var(--a-border)",
        borderRadius: 12,
        padding: 8,
        minWidth: 220,
        boxShadow: "0 20px 60px var(--a-shadow)",
        animation: "dropdownIn 150ms ease",
      }}
    >
      {children.map((child) => {
        const Icon = child.icon;
        const isSoon = !!child.badge;
        const active = !isSoon && isChildActive(child.href);

        if (isSoon) {
          return (
            <div
              key={child.href + child.label}
              className="flex items-center gap-2.5 rounded-lg"
              style={{
                padding: "10px 12px",
                color: "var(--a-text-5)",
                cursor: "default",
                fontSize: 14,
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--a-text-5)" }} />
              <span className="flex-1 truncate">{child.label}</span>
              <span
                className="shrink-0"
                style={{
                  fontSize: 10,
                  color: "var(--a-text-4)",
                  background: "var(--a-bg-hover)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  pointerEvents: "none",
                }}
              >
                {child.badge}
              </span>
            </div>
          );
        }

        return (
          <Link
            key={child.href + child.label}
            href={child.href}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg transition-colors duration-100"
            style={{
              padding: "10px 12px",
              color: active ? "var(--a-accent)" : "var(--a-text-name)",
              fontSize: 14,
              background: active ? "var(--a-accent-bg)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = "var(--a-bg-hover)";
                e.currentTarget.style.color = "var(--a-text)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--a-text-name)";
              }
            }}
          >
            <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "var(--a-accent)" : "currentColor" }} />
            <span className="truncate">{child.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
