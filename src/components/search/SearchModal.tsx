"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Search, X, Loader2, ArrowRight, Tag, Grid3X3 } from "lucide-react";
import { useLanguage, localizedName } from "@/hooks/useLanguage";
import { trackSearch } from "@/lib/analytics/tracker";

interface SearchProduct {
  id: string;
  slug: string;
  name_uk: string;
  name_ru?: string | null;
  price: number;
  old_price: number | null;
  main_image_url: string | null;
  sku: string | null;
  quantity: number;
  status: string;
}

interface SearchCategory {
  id: string;
  slug: string;
  name_uk: string;
  name_ru?: string | null;
  product_count: number;
}

interface SearchBrand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
}

interface SearchResults {
  products: SearchProduct[];
  categories: SearchCategory[];
  brands: SearchBrand[];
}

const POPULAR_QUERIES = [
  "Гель-лак",
  "База",
  "Топ",
  "Фреза",
  "Пилка",
  "Kodi",
  "Масло для кутикули",
];

function fmtPrice(v: number) {
  return v.toLocaleString("uk-UA");
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 200);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      setLoading(false);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: SearchResults = await res.json();
        setResults(data);
        trackSearch(q, data.products.length + data.categories.length + data.brands.length);
      }
    } catch (err) {
      console.error('[SearchModal] Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      doSearch(value.trim());
    }, 300);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length > 0) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
      onClose();
    }
  }

  function handleResultClick() {
    onClose();
  }

  function handlePopularClick(q: string) {
    setQuery(q);
    doSearch(q);
  }

  const hasResults =
    results &&
    (results.products.length > 0 ||
      results.categories.length > 0 ||
      results.brands.length > 0);

  const noResults =
    results &&
    query.length >= 2 &&
    results.products.length === 0 &&
    results.categories.length === 0 &&
    results.brands.length === 0;

  if (!ready || !mounted) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-opacity duration-150 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-x-0 top-0 z-[70] mx-auto w-full max-w-2xl px-4 pt-[10vh] transition-all duration-200 ease-out sm:pt-[12vh] ${
          visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-5 scale-[0.98] opacity-0"
        }`}
      >
            <div className="overflow-hidden rounded-card border border-[var(--border)] bg-white shadow-[0_16px_64px_rgba(0,0,0,.12)]">
              {/* Search input */}
              <form onSubmit={handleSubmit} className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--t3)]"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInput(e.target.value)}
                  placeholder="Шукати товари, бренди, категорії..."
                  className="h-14 w-full bg-transparent pl-12 pr-20 text-base text-dark outline-none placeholder:text-[var(--t3)]"
                  autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                  {loading && (
                    <Loader2 size={16} className="animate-spin text-[var(--t3)]" />
                  )}
                  {query.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleInput("")}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--t3)] hover:bg-sand hover:text-[var(--t2)]"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <kbd className="hidden rounded border border-[var(--border)] bg-sand px-1.5 py-0.5 text-[10px] font-medium text-[var(--t3)] sm:inline">
                    ESC
                  </kbd>
                </div>
              </form>

              <div className="h-px bg-[var(--border)]" />

              <div className="max-h-[60vh] overflow-y-auto">
                {/* Popular queries */}
                {query.length < 2 && !results && (
                  <div className="p-4">
                    <p className="font-unbounded mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
                      Популярні запити
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_QUERIES.map((q) => (
                        <button
                          key={q}
                          onClick={() => handlePopularClick(q)}
                          className="rounded-pill border border-[var(--border)] bg-sand px-3 py-1.5 text-sm text-[var(--t2)] transition-all hover:border-coral hover:text-coral"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {hasResults && results.categories.length > 0 && (
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <p className="font-unbounded mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
                      Категорії
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {results.categories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/catalog/${cat.slug}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-all hover:bg-sand"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-coral-light text-coral">
                            <Grid3X3 size={14} />
                          </div>
                          <span className="text-sm text-dark">{localizedName(cat, lang)}</span>
                          <span className="ml-auto text-[10px] text-[var(--t3)]">
                            {cat.product_count} товарів
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brands */}
                {hasResults && results.brands.length > 0 && (
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <p className="font-unbounded mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
                      Бренди
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {results.brands.map((brand) => (
                        <Link
                          key={brand.id}
                          href={`/catalog?brands=${brand.slug}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-all hover:bg-sand"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-violet/[0.06] text-violet">
                            <Tag size={14} />
                          </div>
                          <span className="text-sm text-dark">{brand.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products */}
                {hasResults && results.products.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="font-unbounded mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
                      Товари
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {results.products.map((p) => (
                        <Link
                          key={p.id}
                          href={`/product/${p.slug}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-all hover:bg-sand"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border border-[var(--border)] bg-sand">
                            {p.main_image_url ? (
                              <Image
                                src={p.main_image_url}
                                alt={localizedName(p, lang)}
                                fill
                                sizes="48px"
                                className="object-contain p-0.5"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[var(--t3)]">
                                <Search size={14} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm text-dark">{localizedName(p, lang)}</p>
                            {p.sku && (
                              <p className="font-price text-[10px] text-[var(--t3)]">{p.sku}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-price text-sm font-bold text-dark">
                              {fmtPrice(p.price)} ₴
                            </span>
                            {p.old_price && p.old_price > p.price && (
                              <span className="ml-1.5 font-price text-[10px] text-[var(--t3)] line-through">
                                {fmtPrice(p.old_price)} ₴
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {noResults && !loading && (
                  <div className="flex flex-col items-center gap-2 px-4 py-10">
                    <Search size={32} className="text-[var(--t3)]" />
                    <p className="text-sm text-[var(--t2)]">
                      Нічого не знайдено за запитом &quot;{query}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {query.length >= 2 && (
                <div className="border-t border-[var(--border)]">
                  <button
                    onClick={handleSubmit as () => void}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-coral transition-colors hover:bg-coral-light hover:text-coral-2"
                  >
                    Показати всі результати для &quot;{query}&quot;
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
      </div>
    </>,
    document.body,
  );
}
