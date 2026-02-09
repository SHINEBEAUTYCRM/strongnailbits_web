"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SortBar } from "./SortBar";
import type { SubcategoryItem } from "./FilterDrawer";
import type { BrandFilterItem } from "./Filters";

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
}

export function CatalogToolbar({
  total,
  brands,
  minPrice,
  maxPrice,
  subcategories,
  categoryName,
}: CatalogToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <>
      <SortBar total={total} onOpenFilters={() => setFiltersOpen(true)} />
      <FilterDrawer
        brands={brands}
        minPrice={minPrice}
        maxPrice={maxPrice}
        total={total}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        subcategories={subcategories}
        categoryName={categoryName}
      />
    </>
  );
}
