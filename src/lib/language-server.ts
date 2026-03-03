import { cookies } from "next/headers";
import { type Lang, LANG_COOKIE, DEFAULT_LANG } from "./language";

export type { Lang };
export { localizedName, localizedDescription } from "./language";

/**
 * Get current language from cookies (server-side only).
 * Must be called inside a Server Component or Route Handler.
 */
export async function getLanguage(): Promise<Lang> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LANG_COOKIE)?.value;
  return value === "ru" ? "ru" : DEFAULT_LANG;
}
