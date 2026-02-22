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

const HISTORY_KEY = "shine-search-history";
const MAX_HISTORY = 6;

function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToSearchHistory(q: string) {
  try {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    const history = getSearchHistory().filter(h => h.toLowerCase() !== trimmed.toLowerCase());
    history.unshift(trimmed);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* ignore */ }
}

function clearSearchHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span className="text-[#D6264A] font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  );
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
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setHistory(getSearchHistory());
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
      setSuggestions([]);
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
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      doSearch(value.trim());
      fetch(`/api/search/suggest?q=${encodeURIComponent(value.trim())}`)
        .then((r) => r.json())
        .then((data) => setSuggestions(data))
        .catch(() => setSuggestions([]));
    }, 200);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length > 0) {
      addToSearchHistory(query);
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
      onClose();
    }
  }

  function handleResultClick() {
    addToSearchHistory(query);
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
                {/* Autocomplete suggestions */}
                {suggestions.length > 0 && query.length >= 2 && (
                  <div className="border-b border-gray-100 px-2 py-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setQuery(s);
                          doSearch(s);
                          setSuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <HighlightMatch text={s} query={query} />
                      </button>
                    ))}
                  </div>
                )}

                {/* History + Popular queries */}
                {query.length < 2 && !results && (
                  <div className="p-4 space-y-4">
                    {history.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-unbounded text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">Нещодавно шукали</span>
                          <button
                            onClick={() => { clearSearchHistory(); setHistory([]); }}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Очистити
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {history.map((h) => (
                            <button
                              key={h}
                              onClick={() => handlePopularClick(h)}
                              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-[#444] transition-colors hover:border-[#D6264A] hover:text-[#D6264A]"
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="font-unbounded mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
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
                          {brand.logo_url ? (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white border border-[var(--border)] overflow-hidden">
                              <img src={brand.logo_url} alt={brand.name} className="h-6 w-6 object-contain" />
                            </div>
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-coral/[0.06] text-coral">
                              <Tag size={14} />
                            </div>
                          )}
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
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                            {p.main_image_url ? (
                              <Image
                                src={p.main_image_url}
                                alt={localizedName(p, lang)}
                                fill
                                sizes="48px"
                                className="object-contain p-0.5"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Tag size={16} className="text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-medium text-[#222]">{localizedName(p, lang)}</p>
                            {p.sku && (
                              <p className="text-xs text-gray-400 mt-0.5">Арт: {p.sku}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-sm font-bold text-[#222]" style={{ fontFamily: 'var(--font-jetbrains)' }}>
                              {fmtPrice(p.price)} ₴
                            </span>
                            {p.old_price && p.old_price > p.price && (
                              <span className="block text-xs text-gray-400 line-through">
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
