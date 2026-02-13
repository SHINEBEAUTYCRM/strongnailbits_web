"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { User, Store, LogOut, Crown, UserCog, Loader2 } from "lucide-react";
import { DangrowBadge } from "./DangrowBadge";

interface AdminProfileDropdownProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  displayEmail: string;
  displayInitial: string;
  isAdmin: boolean;
  loggingOut: boolean;
  onLogout: () => void;
}

export function AdminProfileDropdown({
  open,
  onClose,
  displayName,
  displayEmail,
  displayInitial,
  isAdmin,
  loggingOut,
  onLogout,
}: AdminProfileDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the trigger click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-[60]"
      style={{
        width: 260,
        background: "rgba(10, 10, 15, 0.98)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        animation: "dropdownIn 150ms ease",
      }}
    >
      {/* User info */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: isAdmin ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#1e3a5f" }}
          >
            {displayInitial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: "#e4e4e7" }}>
              {displayName}
              {isAdmin ? (
                <Crown className="w-3 h-3 shrink-0" style={{ color: "#a855f7" }} />
              ) : (
                <UserCog className="w-3 h-3 shrink-0" style={{ color: "#60a5fa" }} />
              )}
            </p>
            <p className="text-[11px] truncate" style={{ color: "#555" }}>
              {displayEmail}
            </p>
          </div>
        </div>
        <div className="mt-2">
          <span
            className="inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{
              color: isAdmin ? "#a855f7" : "#60a5fa",
              background: isAdmin ? "rgba(168,85,247,0.1)" : "rgba(96,165,250,0.1)",
            }}
          >
            {isAdmin ? "admin" : "manager"}
          </span>
        </div>
      </div>

      {/* Menu items */}
      <div className="p-1.5">
        <Link
          href="/admin/users"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "#ccc" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#ccc";
          }}
        >
          <User className="w-4 h-4" /> Користувачі
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "#ccc" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#ccc";
          }}
        >
          <Store className="w-4 h-4" /> Магазин
        </a>
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "#ef4444" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Вийти
        </button>
      </div>

      {/* Powered by */}
      <div
        className="flex justify-center py-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <DangrowBadge compact />
      </div>
    </div>
  );
}
