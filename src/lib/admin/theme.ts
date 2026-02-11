"use client";

import { useState, useEffect, useCallback } from "react";

export type AdminTheme = "dark" | "light" | "auto";

const STORAGE_KEY = "admin-theme";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(theme: AdminTheme): "dark" | "light" {
  return theme === "auto" ? getSystemTheme() : theme;
}

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>("dark");
  const [resolved, setResolved] = useState<"dark" | "light">("dark");

  // Load saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AdminTheme | null;
      if (saved && ["dark", "light", "auto"].includes(saved)) {
        setThemeState(saved);
        setResolved(resolveTheme(saved));
      }
    } catch {}
  }, []);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme !== "auto") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(getSystemTheme());
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: AdminTheme) => {
    setThemeState(t);
    setResolved(resolveTheme(t));
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }, []);

  return { theme, resolved, setTheme };
}
