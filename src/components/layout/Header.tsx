"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  ShoppingBag,
  User,
  Menu,
  X,
  Heart,
  ChevronRight,
  ChevronLeft,
  Phone,
  Clock,
  LayoutGrid,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { useCategoryTree, type CatNode } from "@/hooks/useCategoryTree";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageSwitcher, LanguageSwitcherMini } from "@/components/ui/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { SiteContacts } from "@/lib/site-settings";

const CartDrawer = dynamic(
  () => import("@/components/cart/CartDrawer").then((m) => m.CartDrawer),
  { ssr: false },
);
const SearchModal = dynamic(
  () => import("@/components/search/SearchModal").then((m) => m.SearchModal),
  { ssr: false },
);

interface HeaderProps {
  contacts?: SiteContacts | null;
  logoUrl?: string | null;
}

export function Header({ contacts, logoUrl }: HeaderProps) {
  const phoneDisplay = contacts?.phone ?? "+38 (093) 744-38-89";
  const phoneRaw = contacts?.phone_raw ?? "+380937443889";
  const scheduleWeekdays = contacts?.schedule?.weekdays ?? "Пн-Пт: 9:00 — 18:00";
  const telegramUrl = "https://t.me/strongnailbits_ua";
  const instagramUrl = "https://www.instagram.com/strongnailbits.com.ua/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* Drill-down for mobile */
  const [menuStack, setMenuStack] = useState<CatNode[]>([]);
  const tree = useCategoryTree();

  /* Desktop catalog hover */
  const [hoveredCatId, setHoveredCatId] = useState<number | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const catalogRef = useRef<HTMLDivElement>(null);

  useLanguage();

  const findByCsCartId = (nodes: CatNode[], id: number): CatNode | null => {
    for (const n of nodes) {
      if (n.cs_cart_id === id) return n;
      const found = findByCsCartId(n.children, id);
      if (found) return found;
    }
    return null;
  };

  const totalSum = useCartStore((s) => s.getTotal());
  const count = useCartStore((s) => s.getCount());
  const wishlistCount = useWishlistStore((s) => s.getCount());

  useEffect(() => {
    setMounted(true);
  }, []);

  /* open cart from custom event (e.g. ReorderButton) */
  useEffect(() => {
    const handler = () => setCartOpen(true);
    window.addEventListener("open-cart", handler);
    return () => window.removeEventListener("open-cart", handler);
  }, []);

  /* scroll → shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  /* Close catalog dropdown on outside click is handled by the backdrop overlay */

  /* Lock page scroll for mobile menu */
  useEffect(() => {
    const html = document.documentElement;
    if (mobileMenuOpen) {
      html.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      html.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      html.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  /* cart badge pulse */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (mounted && count > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 300);
      return () => clearTimeout(t);
    }
  }, [count, mounted]);

  /* Mobile menu helpers */
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMenuStack([]);
  };
  const pushCat = (cat: CatNode) => {
    if (cat.children.length > 0) setMenuStack((p) => [...p, cat]);
  };
  const popCat = () => setMenuStack((p) => p.slice(0, -1));

  const currentParent =
    menuStack.length > 0 ? menuStack[menuStack.length - 1] : null;
  const currentItems = currentParent ? currentParent.children : tree;
  const currentTitle = currentParent ? currentParent.name_uk : "Каталог";

  const hoveredCat = hoveredCatId
    ? findByCsCartId(tree, hoveredCatId)
    : null;

  return (
    <>
      {/* ═══════════════════════════════════════════ */}
      {/*  STICKY HEADER                              */}
      {/* ═══════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[var(--card)]/80 shadow-[0_2px_20px_rgba(0,0,0,0.06)] backdrop-blur-2xl"
            : "bg-[var(--card)] backdrop-blur-none"
        }`}
      >
        {/* ── Desktop ── */}
        <div className="mx-auto hidden h-[72px] max-w-[1400px] items-center gap-4 px-6 lg:flex">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Strong Nail Bits" className="h-[52px] w-auto object-contain" />
            ) : (
              <span className="flex items-baseline gap-1.5">
                <span className="font-unbounded text-xl font-black text-[#1a1a1a]">STRONG NAIL</span>
                <span className="font-unbounded text-xl font-black text-coral">BITS</span>
              </span>
            )}
          </Link>

          {/* Catalog button + dropdown */}
          <div ref={catalogRef} className="relative">
            <button
              onClick={() => {
                setCatalogOpen(!catalogOpen);
                setHoveredCatId(null);
                setExpandedCats({});
              }}
              className={`flex h-11 items-center gap-2.5 rounded-2xl px-5 text-[14px] font-bold text-white transition-all ${
                catalogOpen
                  ? "bg-[#B8203F]"
                  : "bg-coral hover:bg-[#B8203F]"
              }`}
            >
              {catalogOpen ? <X size={18} /> : <LayoutGrid size={18} />}
              Каталог
            </button>

            {/* Catalog button — dropdown rendered outside header */}
          </div>

          {/* Search bar (opens modal on click) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-11 flex-1 items-center gap-3 rounded-2xl border border-[#e8e8e8] bg-[#f8f8f8] px-4 text-left transition-colors hover:border-coral/30"
          >
            <Search size={18} className="shrink-0 text-[#6b6b7b]" />
            <span className="text-sm text-[#6b6b7b]">
              Пошук товарів...
            </span>
            <span className="ml-auto hidden items-center gap-1 rounded-lg border border-[#e8e8e8] bg-white px-2 py-0.5 text-[10px] font-medium text-[#6b6b7b] xl:flex">
              ⌘K
            </span>
          </button>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />

            <Link
              href="/account"
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#6b6b7b] transition-colors hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
              title="Акаунт"
            >
              <User size={22} />
            </Link>

            <Link
              href="/wishlist"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-[#6b6b7b] transition-colors hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
              title="Обране"
            >
              <Heart size={22} />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "#D6264A" }}>
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setCartOpen(true)}
              className="relative flex h-11 items-center gap-2 rounded-2xl bg-[#f0f0f0] px-4 font-medium text-[#1a1a1a] transition-all hover:bg-[#e8e8e8]"
            >
              <ShoppingBag size={20} />
              <span className="text-[14px]">Кошик</span>
              {mounted && count > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white transition-transform ${
                    pulse ? "scale-125" : "scale-100"
                  }`}
                  style={{ background: "#D6264A" }}
                >
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile ── */}
        <div className="mx-auto flex h-[56px] items-center gap-3 px-4 lg:hidden">
          <button
            onClick={() =>
              mobileMenuOpen ? closeMobileMenu() : setMobileMenuOpen(true)
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#1a1a1a]"
            aria-label="Меню"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link href="/" className="flex shrink-0 items-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Strong Nail Bits" className="h-[44px] w-auto object-contain" />
            ) : (
              <span className="flex items-baseline gap-1">
                <span className="font-unbounded text-[15px] font-black text-[#1a1a1a]">STRONG NAIL</span>
                <span className="font-unbounded text-[15px] font-black text-coral">BITS</span>
              </span>
            )}
          </Link>

          <div className="flex-1" />

          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6b6b7b]"
            aria-label="Пошук"
          >
            <Search size={20} />
          </button>

          <Link
            href="/account"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6b6b7b]"
            aria-label="Акаунт"
          >
            <User size={20} />
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#1a1a1a]"
            aria-label="Кошик"
          >
            <ShoppingBag size={20} />
            {mounted && count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "#D6264A" }}>
                {count}
              </span>
            )}
          </button>
        </div>

        {/* Thin bottom border when not scrolled */}
        {!scrolled && (
          <div className="h-px bg-[#f0f0f0]" />
        )}
      </header>

      {/* ═══════════════════════════════════════════ */}
      {/*  CATALOG DROPDOWN (full-width, outside header) */}
      {/* ═══════════════════════════════════════════ */}
      {catalogOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/30"
            onClick={() => {
              setCatalogOpen(false);
              setHoveredCatId(null);
            }}
          />
          <div className="fixed left-0 right-0 top-[72px] z-[70] border-t border-[#f0f0f0] bg-white shadow-[0_16px_64px_rgba(0,0,0,0.12)]">
            <div className="mx-auto flex max-h-[calc(100vh-72px)] max-w-[1400px] px-6">
              {/* Left panel: full category tree roots */}
              <div className="w-[260px] shrink-0 overflow-y-auto border-r border-[#f0f0f0] py-4 pr-2">
                {tree.map((cat) => {
                  const hasChildren = cat.children.length > 0;
                  const isHovered = hoveredCatId === cat.cs_cart_id;

                  return (
                    <Link
                      key={cat.id}
                      href={`/catalog/${cat.slug}`}
                      onClick={() => setCatalogOpen(false)}
                      className={`group flex items-center justify-between rounded-xl px-4 py-2.5 text-[14px] transition-all duration-200 ${
                        isHovered
                          ? "bg-[#fff5f6] font-medium text-coral"
                          : "text-[#1a1a1a] hover:bg-[#f8f8f8]"
                      }`}
                      onMouseEnter={() => {
                        if (hasChildren) {
                          if (hoveredCatId !== cat.cs_cart_id) setExpandedCats({});
                          setHoveredCatId(cat.cs_cart_id);
                        } else {
                          setHoveredCatId(null);
                        }
                      }}
                    >
                      <span>{cat.name_uk}</span>
                      {hasChildren && (
                        <ChevronRight
                          size={14}
                          className={`transition-all duration-200 ${
                            isHovered
                              ? "translate-x-0.5 text-coral"
                              : "text-[#c4c4cc] group-hover:translate-x-0.5 group-hover:text-[#999]"
                          }`}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Right panel: subcategories — fills remaining width */}
              {hoveredCat && hoveredCat.children.length > 0 && (
                <div className="flex-1 overflow-y-auto p-6">
                  <Link
                    href={`/catalog/${hoveredCat.slug}`}
                    onClick={() => setCatalogOpen(false)}
                    className="font-unbounded mb-5 inline-block text-[16px] font-bold text-[#1a1a1a] transition-colors hover:text-coral"
                  >
                    {hoveredCat.name_uk} →
                  </Link>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-6 xl:grid-cols-4">
                    {hoveredCat.children.map((child) => (
                      <div
                        key={child.id}
                        className="border-r border-[#f0f0f0] pr-5 last:border-r-0"
                      >
                        <Link
                          href={`/catalog/${child.slug}`}
                          onClick={() => setCatalogOpen(false)}
                          className="mb-2 block border-b border-[#f0f0f0] pb-1.5 text-[13px] font-semibold text-[#1a1a1a] transition-colors hover:text-coral"
                        >
                          {child.name_uk}
                        </Link>
                        {child.children.length > 0 && (
                          <ul className="flex flex-col gap-0.5">
                            {child.children.map((gc) => (
                              <li key={gc.id}>
                                <Link
                                  href={`/catalog/${gc.slug}`}
                                  onClick={() => setCatalogOpen(false)}
                                  className="block py-0.5 text-[13px] leading-snug text-[#666] transition-colors hover:text-coral"
                                >
                                  {gc.name_uk}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/*  MOBILE MENU (drill-down)                   */}
      {/* ═══════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white pt-[56px] lg:hidden">
          {/* Drill-down header */}
          <div className="flex shrink-0 items-center border-b border-[#f0f0f0] px-4 py-3">
            {menuStack.length > 0 ? (
              <button
                onClick={popCat}
                className="flex items-center gap-1 text-sm font-medium text-[#6b6b7b]"
              >
                <ChevronLeft size={18} />
                Назад
              </button>
            ) : (
              <span className="text-sm font-medium text-[#6e6e7a]">
                Навігація
              </span>
            )}
            <span className="mx-auto font-unbounded text-sm font-bold text-[#1a1a1a]">
              {currentTitle}
            </span>
            <div className="w-14" />
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Root: show all categories from DB tree */}
            {menuStack.length === 0 && (
              <>
                {tree.map((cat) => {
                  const hasChildren = cat.children.length > 0;
                  return hasChildren ? (
                    <button
                      key={cat.id}
                      onClick={() => pushCat(cat)}
                      className="flex w-full items-center justify-between border-b border-[#f0f0f0] px-5 py-4 text-left active:bg-[#f8f8f8]"
                    >
                      <span className="text-base font-medium text-[#1a1a1a]">
                        {cat.name_uk}
                      </span>
                      <ChevronRight size={18} className="text-[#c4c4cc]" />
                    </button>
                  ) : (
                    <Link
                      key={cat.id}
                      href={`/catalog/${cat.slug}`}
                      onClick={closeMobileMenu}
                      className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4 active:bg-[#f8f8f8]"
                    >
                      <span className="text-base font-medium text-[#1a1a1a]">
                        {cat.name_uk}
                      </span>
                      <ChevronRight size={18} className="text-[#c4c4cc]" />
                    </Link>
                  );
                })}
              </>
            )}

            {currentParent && (
              <Link
                href={`/catalog/${currentParent.slug}`}
                onClick={closeMobileMenu}
                className="flex items-center justify-between border-b border-[#f0f0f0] bg-[#fafafa] px-5 py-3 active:bg-[#f0f0f0]"
              >
                <span className="text-sm font-medium text-coral">
                  Дивитись все в &quot;{currentParent.name_uk}&quot;
                </span>
                <ChevronRight size={16} className="text-coral" />
              </Link>
            )}

            {menuStack.length > 0 && currentItems.map((cat) => {
              const hasChildren = cat.children.length > 0;
              return hasChildren ? (
                <button
                  key={cat.id}
                  onClick={() => pushCat(cat)}
                  className="flex w-full items-center justify-between border-b border-[#f0f0f0] px-5 py-4 text-left active:bg-[#f8f8f8]"
                >
                  <span className="text-base font-medium text-[#1a1a1a]">
                    {cat.name_uk}
                  </span>
                  <ChevronRight size={18} className="text-[#c4c4cc]" />
                </button>
              ) : (
                <Link
                  key={cat.id}
                  href={`/catalog/${cat.slug}`}
                  onClick={closeMobileMenu}
                  className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4 active:bg-[#f8f8f8]"
                >
                  <span className="text-base text-[#1a1a1a]">
                    {cat.name_uk}
                  </span>
                  <ChevronRight size={18} className="text-[#c4c4cc]" />
                </Link>
              );
            })}

            {/* Bottom extras (root only) */}
            {menuStack.length === 0 && (
              <>
                <div className="mt-4 border-t border-[#f0f0f0] pt-2">
                  {[
                    { label: "Оптовим клієнтам", href: "/wholesale" },
                    { label: "Доставка і оплата", href: "/delivery" },
                    { label: "Про нас", href: "/about" },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMobileMenu}
                      className="block border-b border-[#f0f0f0] px-5 py-3 text-sm text-[#6b6b7b] active:bg-[#f8f8f8]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="mx-4 mt-4 rounded-2xl bg-[#f8f8f8] p-4">
                  <div className="flex flex-col gap-3 text-sm text-[#6b6b7b]">
                    <a
                      href={`tel:${phoneRaw}`}
                      className="flex items-center gap-2 font-medium text-[#1a1a1a]"
                    >
                      <Phone size={14} />
                      {phoneDisplay}
                    </a>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      {scheduleWeekdays}
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <a
                        href="https://t.me/strongnailbits_ua"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e8e8] text-[#6b6b7b] transition-colors hover:border-coral hover:text-coral"
                        aria-label="Telegram"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                      </a>
                      <a
                        href="https://www.instagram.com/strongnailbits.com.ua/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8e8e8] text-[#6b6b7b] transition-colors hover:border-coral hover:text-coral"
                        aria-label="Instagram"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-4">
                  <LanguageSwitcherMini />
                  <Link
                    href="/account"
                    onClick={closeMobileMenu}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e8e8e8] text-[#6b6b7b]"
                  >
                    <User size={18} />
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={closeMobileMenu}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e8e8e8] text-[#6b6b7b]"
                  >
                    <Heart size={18} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search & Cart */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
