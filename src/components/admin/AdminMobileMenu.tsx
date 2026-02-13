"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronDown } from "lucide-react";
import { adminNavigation, type NavSection } from "@/lib/admin/navigation";
import { DangrowBadge } from "./DangrowBadge";

interface AdminMobileMenuProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  displayEmail: string;
}

export function AdminMobileMenu({ open, onClose, displayName, displayEmail }: AdminMobileMenuProps) {
  const pathname = usePathname();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Close menu on navigation
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isChildActive = (href: string) => {
    const clean = href.split("?")[0];
    if (clean === "/admin") return pathname === "/admin";
    return pathname === clean || pathname.startsWith(clean + "/");
  };

  const isSectionActive = (section: NavSection) =>
    section.children.some((c) => !c.badge && isChildActive(c.href));

  const toggleSection = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 left-0 bottom-0 z-[61] flex flex-col overflow-hidden"
        style={{
          width: "min(320px, 85vw)",
          background: "rgba(8, 8, 12, 0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          animation: "slideInLeft 200ms ease",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between h-14 px-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Link href="/admin" className="flex items-center gap-2" onClick={onClose}>
            <span className="text-lg font-bold tracking-wider" style={{ color: "#a855f7" }}>
              ShineShop
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#555" }}>
              OS
            </span>
          </Link>
          <button onClick={onClose} style={{ color: "#888" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav sections (accordion) */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {adminNavigation.map((section) => {
            const SectionIcon = section.icon;
            const expanded = expandedId === section.id;
            const active = isSectionActive(section);
            const isSoonSection = !!section.badge;

            return (
              <div key={section.id} className="mb-1">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100"
                  style={{
                    color: isSoonSection ? "#444" : active ? "#a855f7" : "#999",
                    background: expanded ? "rgba(255,255,255,0.03)" : "transparent",
                    cursor: isSoonSection ? "default" : "pointer",
                  }}
                >
                  <SectionIcon className="w-[18px] h-[18px] shrink-0" />
                  <span className="flex-1 text-left text-sm font-medium">{section.label}</span>
                  {isSoonSection && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#555",
                        background: "rgba(255,255,255,0.04)",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {section.badge}
                    </span>
                  )}
                  {!isSoonSection && (
                    <ChevronDown
                      className="w-4 h-4 shrink-0 transition-transform duration-200"
                      style={{
                        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        color: "#555",
                      }}
                    />
                  )}
                </button>

                {/* Children (accordion body) */}
                {expanded && !isSoonSection && (
                  <div
                    className="ml-3 pl-3 mt-1 mb-2"
                    style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {section.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isSoon = !!child.badge;
                      const childActive = !isSoon && isChildActive(child.href);

                      if (isSoon) {
                        return (
                          <div
                            key={child.href + child.label}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                            style={{ color: "#444", cursor: "default", fontSize: 13 }}
                          >
                            <ChildIcon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 truncate">{child.label}</span>
                            <span
                              style={{
                                fontSize: 10,
                                color: "#555",
                                background: "rgba(255,255,255,0.04)",
                                padding: "2px 6px",
                                borderRadius: 4,
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
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors duration-100"
                          style={{
                            color: childActive ? "#a855f7" : "#aaa",
                            background: childActive ? "rgba(168,85,247,0.06)" : "transparent",
                            fontSize: 13,
                          }}
                        >
                          <ChildIcon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer: user info + DANGROW */}
        <div
          className="shrink-0 px-4 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              {(displayName[0] || "A").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "#e4e4e7" }}>
                {displayName}
              </p>
              <p className="text-[11px] truncate" style={{ color: "#555" }}>
                {displayEmail}
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <DangrowBadge compact />
          </div>
        </div>
      </div>
    </>
  );
}
