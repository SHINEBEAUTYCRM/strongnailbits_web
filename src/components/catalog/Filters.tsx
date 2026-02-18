"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";

export interface BrandFilterItem {
  id: string;
  slug: string;
  name: string;
  count: number;
}

interface FiltersProps {
  brands: BrandFilterItem[];
  minPrice?: number;
  maxPrice?: number;
  onApplied?: () => void;
}

const INITIAL_BRANDS_SHOWN = 10;

export function Filters({
  brands,
  minPrice = 0,
  maxPrice = 99999,
  onApplied,
}: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlPriceMin = searchParams.get("price_min") ?? "";
  const urlPriceMax = searchParams.get("price_max") ?? "";
  const urlBrands = searchParams.get("brands") ?? "";
  const urlInStock = searchParams.get("in_stock") === "true";

  const [priceFrom, setPriceFrom] = useState(urlPriceMin);
  const [priceTo, setPriceTo] = useState(urlPriceMax);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(
    () => new Set(urlBrands ? urlBrands.split(",") : []),
  );
  const [inStock, setInStock] = useState(urlInStock);
  const [brandSearch, setBrandSearch] = useState("");
  const [showAllBrands, setShowAllBrands] = useState(false);

  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brands;
    const q = brandSearch.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, brandSearch]);

  const visibleBrands = showAllBrands
    ? filteredBrands
    : filteredBrands.slice(0, INITIAL_BRANDS_SHOWN);

  const hasHiddenBrands = filteredBrands.length > INITIAL_BRANDS_SHOWN;

  const hasActiveFilters =
    priceFrom !== "" ||
    priceTo !== "" ||
    selectedBrands.size > 0 ||
    inStock;

  const toggleBrand = useCallback((slug: string) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());

    if (priceFrom && Number(priceFrom) > 0) params.set("price_min", priceFrom);
    else params.delete("price_min");

    if (priceTo && Number(priceTo) > 0) params.set("price_max", priceTo);
    else params.delete("price_max");

    if (selectedBrands.size > 0) params.set("brands", [...selectedBrands].join(","));
    else params.delete("brands");

    if (inStock) params.set("in_stock", "true");
    else params.delete("in_stock");

    params.delete("page");

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    onApplied?.();
  }

  function resetFilters() {
    setPriceFrom("");
    setPriceTo("");
    setSelectedBrands(new Set());
    setInStock(false);
    setBrandSearch("");
    setShowAllBrands(false);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("price_min");
    params.delete("price_max");
    params.delete("brands");
    params.delete("in_stock");
    params.delete("page");

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    onApplied?.();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Price range */}
      <div>
        <h4 className="font-unbounded mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
          Ціна, ₴
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={minPrice.toString()}
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            min={0}
            className="h-9 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-dark outline-none placeholder:text-[var(--t3)] focus:border-coral/40"
          />
          <span className="shrink-0 text-xs text-[var(--t3)]">—</span>
          <input
            type="number"
            placeholder={maxPrice.toString()}
            value={priceTo}
            onChange={(e) => setPriceTo(e.target.value)}
            min={0}
            className="h-9 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-dark outline-none placeholder:text-[var(--t3)] focus:border-coral/40"
          />
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h4 className="font-unbounded mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
            Бренд
          </h4>

          {brands.length > 6 && (
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--t3)]"
              />
              <input
                type="text"
                value={brandSearch}
                onChange={(e) => {
                  setBrandSearch(e.target.value);
                  setShowAllBrands(true);
                }}
                placeholder="Шукати бренд..."
                className="h-8 w-full rounded-[10px] border border-[var(--border)] bg-white pl-8 pr-3 text-xs text-dark outline-none placeholder:text-[var(--t3)] focus:border-coral/40"
              />
              {brandSearch && (
                <button
                  onClick={() => setBrandSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--t3)] hover:text-[var(--t2)]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto">
            {visibleBrands.map((brand) => (
              <label
                key={brand.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 transition-colors hover:bg-sand"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.has(brand.slug)}
                  onChange={() => toggleBrand(brand.slug)}
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer appearance-none rounded border border-[var(--border)] bg-white checked:border-coral checked:bg-coral focus:outline-none"
                />
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--t)]">
                  {brand.name}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--t3)]">
                  {brand.count}
                </span>
              </label>
            ))}
          </div>

          {hasHiddenBrands && !brandSearch && (
            <button
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-coral transition-colors hover:text-coral-2"
            >
              {showAllBrands ? (
                <>Згорнути <ChevronUp size={12} /></>
              ) : (
                <>Показати ще ({filteredBrands.length - INITIAL_BRANDS_SHOWN}) <ChevronDown size={12} /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* In stock toggle */}
      <label className="flex cursor-pointer items-center justify-between rounded-[10px] border border-[var(--border)] bg-white px-3 py-2.5 transition-all hover:border-coral/20">
        <span className="text-xs font-medium text-[var(--t)]">
          Тільки в наявності
        </span>
        <div className="relative">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-[var(--t3)]/30 transition-colors peer-checked:bg-coral" />
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
      </label>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={applyFilters}
          className="font-unbounded h-10 w-full rounded-pill bg-coral text-[12px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral"
        >
          Застосувати
        </button>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="h-9 w-full rounded-pill border border-[var(--border)] text-xs font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
          >
            Скинути фільтри
          </button>
        )}
      </div>
    </div>
  );
}
