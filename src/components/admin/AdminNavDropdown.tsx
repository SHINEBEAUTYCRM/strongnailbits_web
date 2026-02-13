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
        background: "rgba(10, 10, 15, 0.98)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 8,
        minWidth: 220,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
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
                color: "#444",
                cursor: "default",
                fontSize: 14,
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: "#444" }} />
              <span className="flex-1 truncate">{child.label}</span>
              <span
                className="shrink-0"
                style={{
                  fontSize: 10,
                  color: "#555",
                  background: "rgba(255,255,255,0.04)",
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
              color: active ? "#a855f7" : "#ccc",
              fontSize: 14,
              background: active ? "rgba(168,85,247,0.06)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#ccc";
              }
            }}
          >
            <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "#a855f7" : "currentColor" }} />
            <span className="truncate">{child.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
