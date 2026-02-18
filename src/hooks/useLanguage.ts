"use client";

import { useState, useEffect, useCallback } from "react";

export type Lang = "uk" | "ru";

const COOKIE_NAME = "lang";
const DEFAULT_LANG: Lang = "uk";

function readCookie(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const value = match?.[1];
  return value === "ru" ? "ru" : DEFAULT_LANG;
}

function writeCookie(lang: Lang) {
  document.cookie = `${COOKIE_NAME}=${lang};path=/;max-age=${365 * 24 * 3600};samesite=lax`;
}

/**
 * Client-side hook for language preference.
 * Reads/writes a `lang` cookie.
 */
export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(readCookie());
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    writeCookie(newLang);
    // Reload to re-render server components with new language
    window.location.reload();
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "uk" ? "ru" : "uk");
  }, [lang, setLang]);

  return { lang, setLang, toggle };
}

/**
 * Pick localized name from an object (client-side version).
 */
export function localizedName(
  item: { name_uk: string; name_ru?: string | null },
  lang: Lang,
): string {
  if (lang === "ru") return item.name_ru || item.name_uk;
  return item.name_uk;
}
