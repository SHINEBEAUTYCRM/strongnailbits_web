import { cookies } from "next/headers";

export type Lang = "uk" | "ru";

const COOKIE_NAME = "lang";
const DEFAULT_LANG: Lang = "uk";

/**
 * Get current language from cookies (server-side).
 * Must be called inside a Server Component or Route Handler.
 */
export async function getLanguage(): Promise<Lang> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return value === "ru" ? "ru" : DEFAULT_LANG;
}

/**
 * Pick localized name from an object that has name_uk and name_ru.
 * Falls back to name_uk if name_ru is empty.
 */
export function localizedName(
  item: { name_uk: string; name_ru?: string | null },
  lang: Lang,
): string {
  if (lang === "ru") return item.name_ru || item.name_uk;
  return item.name_uk;
}

/**
 * Pick localized description.
 * Falls back to description_uk if description_ru is empty.
 */
export function localizedDescription(
  item: { description_uk?: string | null; description_ru?: string | null },
  lang: Lang,
): string | null {
  if (lang === "ru") return item.description_ru || item.description_uk || null;
  return item.description_uk || null;
}
