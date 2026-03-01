"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function getStoredTheme(): "light" | "dark" | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("theme") as "light" | "dark" | null;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    const active = stored ?? getSystemTheme();
    setTheme(active);
    document.documentElement.classList.toggle("dark", active === "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    // Also set cookie so server can read it for SSR
    document.cookie = `theme=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
  }

  if (!mounted) {
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent"
        aria-label="Toggle theme"
      >
        <Sun size={18} className="text-[var(--t3)]" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:bg-[var(--bg)] active:scale-95"
      aria-label={theme === "light" ? "Темна тема" : "Світла тема"}
    >
      {theme === "light" ? (
        <Moon size={18} className="text-[var(--t3)] transition-colors" />
      ) : (
        <Sun size={18} className="text-amber-400 transition-colors" />
      )}
    </button>
  );
}
