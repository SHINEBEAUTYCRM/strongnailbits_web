"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import type { AdminTheme } from "@/lib/admin/theme";

const options: { value: AdminTheme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Світла" },
  { value: "dark", icon: Moon, label: "Темна" },
  { value: "auto", icon: Monitor, label: "Авто" },
];

interface ThemeSwitcherProps {
  theme: AdminTheme;
  onChange: (t: AdminTheme) => void;
}

export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps) {
  return (
    <div
      className="flex items-center rounded-lg p-0.5"
      style={{ background: "var(--a-bg-input)" }}
    >
      {options.map((opt) => {
        const active = theme === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all"
            style={
              active
                ? {
                    background: "var(--a-bg-card)",
                    color: "var(--a-text)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }
                : { color: "var(--a-text-3)" }
            }
            title={opt.label}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact version for the header bar */
export function ThemeSwitcherCompact({
  theme,
  onChange,
}: ThemeSwitcherProps) {
  const next: AdminTheme =
    theme === "dark" ? "light" : theme === "light" ? "auto" : "dark";
  const Icon =
    theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label =
    theme === "dark" ? "Темна" : theme === "light" ? "Світла" : "Авто";

  return (
    <button
      onClick={() => onChange(next)}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-all"
      style={{
        background: "var(--a-bg-input)",
        border: "1px solid var(--a-border)",
        color: "var(--a-text-2)",
      }}
      title={`Тема: ${label}`}
    >
      <Icon size={15} />
    </button>
  );
}
