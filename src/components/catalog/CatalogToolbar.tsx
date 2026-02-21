"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { SortBar } from "./SortBar";
import type { SubcategoryItem } from "./FilterDrawer";
import type { BrandFilterItem } from "./Filters";
import type { FeatureFilterData } from "@/lib/catalog/filters";

const FilterDrawer = dynamic(
  () => import("./FilterDrawer").then((m) => m.FilterDrawer),
  { ssr: false },
);

interface CatalogToolbarProps {
  total: number;
  brands: BrandFilterItem[];
  minPrice?: number;
  maxPrice?: number;
  subcategories?: SubcategoryItem[];
  categoryName?: string;
  featureFilters?: FeatureFilterData[];
}

export function CatalogToolbar({
  total,
  brands,
  minPrice,
  maxPrice,
  subcategories,
  categoryName,
  featureFilters,
}: CatalogToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build lookup: variant_id → { label, filterName }
  const variantLookup = useMemo(() => {
    const map = new Map<string, { label: string; filterName: string; handle: string }>();
    if (!featureFilters) return map;
    for (const f of featureFilters) {
      for (const v of f.values) {
        map.set(v.id, { label: v.label_uk, filterName: f.name_uk, handle: f.handle });
      }
    }
    return map;
  }, [featureFilters]);

  // Collect active chips
  const chips = useMemo(() => {
    const result: Array<{ key: string; label: string; paramKey: string; paramValue: string }> = [];

    // Brand chips
    const brandParam = searchParams.get("brands");
    if (brandParam) {
      for (const slug of brandParam.split(",").filter(Boolean)) {
        const brand = brands.find((b) => b.slug === slug);
        result.push({
          key: `brand-${slug}`,
          label: `Бренд: ${brand?.name ?? slug}`,
          paramKey: "brands",
          paramValue: slug,
        });
      }
    }

    // Feature chips
    for (const [key, value] of searchParams.entries()) {
      if (!key.startsWith("f_") || !value) continue;
      for (const variantId of value.split(",").filter(Boolean)) {
        const info = variantLookup.get(variantId);
        result.push({
          key: `${key}-${variantId}`,
          label: info ? `${info.filterName}: ${info.label}` : variantId,
          paramKey: key,
          paramValue: variantId,
        });
      }
    }

    return result;
  }, [searchParams, brands, variantLookup]);

  function removeChip(chip: typeof chips[0]) {
    const params = new URLSearchParams(searchParams.toString());

    if (chip.paramKey === "brands") {
      const current = (params.get("brands") ?? "").split(",").filter(Boolean);
      const next = current.filter((s) => s !== chip.paramValue);
      if (next.length > 0) params.set("brands", next.join(","));
      else params.delete("brands");
    } else if (chip.paramKey.startsWith("f_")) {
      const current = (params.get(chip.paramKey) ?? "").split(",").filter(Boolean);
      const next = current.filter((id) => id !== chip.paramValue);
      if (next.length > 0) params.set(chip.paramKey, next.join(","));
      else params.delete(chip.paramKey);
    }

    params.delete("page");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function clearAllChips() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("brands");
    params.delete("price_min");
    params.delete("price_max");
    params.delete("in_stock");
    params.delete("page");
    for (const key of [...params.keys()]) {
      if (key.startsWith("f_")) params.delete(key);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <>
      <SortBar total={total} onOpenFilters={() => setFiltersOpen(true)} />

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => removeChip(chip)}
              className="flex items-center gap-1 rounded-pill border border-[var(--border)] bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--t2)] transition-all hover:border-coral hover:text-coral"
            >
              {chip.label}
              <X size={12} className="shrink-0" />
            </button>
          ))}
          <button
            onClick={clearAllChips}
            className="text-[11px] font-medium text-coral transition-colors hover:text-coral-2"
          >
            Скинути всі
          </button>
        </div>
      )}

      <FilterDrawer
        brands={brands}
        minPrice={minPrice}
        maxPrice={maxPrice}
        total={total}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        subcategories={subcategories}
        categoryName={categoryName}
        featureFilters={featureFilters}
      />
    </>
  );
}
