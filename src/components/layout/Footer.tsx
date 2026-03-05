import Link from "next/link";
import type { SiteContacts, SiteSocial } from "@/lib/site-settings";

/* ---- Fallbacks (used when DB is not available) ---- */

const FALLBACK_CATALOG_LINKS = [
  { label: "Гель-лаки", href: "/catalog/gel-laki" },
  { label: "Бази", href: "/catalog/bazy" },
  { label: "Топи", href: "/catalog/topy" },
  { label: "Для обличчя і тіла", href: "/catalog/dlya-oblychya-i-tila" },
  { label: "Брови і вії", href: "/catalog/brovy-i-viji" },
  { label: "Депіляція", href: "/catalog/depilyaciya" },
];

const FALLBACK_INFO_LINKS = [
  { label: "Доставка і оплата", href: "/delivery" },
  { label: "Оптовим клієнтам", href: "/wholesale" },
  { label: "Повернення і обмін", href: "/returns" },
  { label: "Про нас", href: "/about" },
  { label: "Контакти", href: "/contacts" },
  { label: "Політика конфіденційності", href: "/privacy" },
];

/* ---- Types ---- */

interface FooterProps {
  contacts?: SiteContacts | null;
  social?: SiteSocial | null;
  footer?: Record<string, unknown> | null;
}

export function Footer({ contacts, social, footer }: FooterProps) {
  const phone = contacts?.phone ?? "+38 (093) 744-38-89";
  const phoneRaw = contacts?.phone_raw ?? "+380937443889";
  const email = contacts?.email ?? "shine.shop.od@gmail.com";
  const address =
    contacts?.address ??
    'м. Одеса, Грецька площа 3/4, ТЦ "Афіна", 4 поверх';
  const weekdays = contacts?.schedule?.weekdays ?? "Пн-Пт: 9:00 — 18:00";
  const saturday = contacts?.schedule?.saturday ?? "Сб: 10:00 — 15:00";

  const description =
    (footer?.description as string) ??
    "Фрези для манікюру та педикюру. Професійні насадки для nail-майстрів та салонів. Доставка по Україні.";
  const catalogLinks =
    (footer?.catalog_links as { label: string; href: string }[]) ??
    FALLBACK_CATALOG_LINKS;
  const infoLinks =
    (footer?.info_links as { label: string; href: string }[]) ??
    FALLBACK_INFO_LINKS;

  const instagramUrl =
    social?.instagram?.url ?? "https://www.instagram.com/strongnailbits.com.ua/";
  const telegramUrl = social?.telegram?.url ?? "https://t.me/strongnailbits_ua";
  const facebookUrl =
    social?.facebook?.url ?? "https://www.facebook.com/strongnailbits.com.ua/";

  return (
    <footer className="bg-[#1a1a1a] text-white">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-baseline gap-1.5">
              <span className="font-unbounded text-xl font-black text-white">
                STRONG NAIL
              </span>
              <span className="font-unbounded text-xl font-black text-coral">
                BITS
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              {description}
            </p>
            {/* Social */}
            <div className="mt-6 flex gap-3">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:border-coral hover:text-coral"
                  aria-label="Instagram"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
              )}
              {telegramUrl && (
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:border-coral hover:text-coral"
                  aria-label="Telegram"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </a>
              )}
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:border-coral hover:text-coral"
                  aria-label="Facebook"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Catalog */}
          <div>
            <h3 className="font-unbounded mb-4 text-xs font-bold uppercase tracking-wider">
              Каталог
            </h3>
            <ul className="flex flex-col gap-2.5">
              {catalogLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-coral"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-unbounded mb-4 text-xs font-bold uppercase tracking-wider">
              Інформація
            </h3>
            <ul className="flex flex-col gap-2.5">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-coral"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="font-unbounded mb-4 text-xs font-bold uppercase tracking-wider">
              Контакти
            </h3>
            <ul className="flex flex-col gap-3 text-sm text-white/60">
              <li>
                <a
                  href={`tel:${phoneRaw}`}
                  className="transition-colors hover:text-coral"
                >
                  {phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="transition-colors hover:text-coral"
                >
                  {email}
                </a>
              </li>
              <li>{address}</li>
              <li>{weekdays}</li>
              <li>{saturday}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          <p>
            &copy; {new Date().getFullYear()} STRONG NAIL BITS. Усі права захищені.{" "}
            <Link
              href="/privacy"
              className="underline transition-colors hover:text-coral"
            >
              Політика конфіденційності
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
