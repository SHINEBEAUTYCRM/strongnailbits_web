"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { getProductWord } from "@/utils/format";

interface SortBarProps {
  total: number;
  onOpenFilters?: () => void;
}

export function SortBar({ total, onOpenFilters }: SortBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "popular";

  function handleSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "popular") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <span className="text-sm text-[var(--t2)]">
        {total.toLocaleString("uk-UA")} {getProductWord(total)}
      </span>

      <div className="flex items-center gap-2">
        {/* Mobile filter button */}
        {onOpenFilters && (
          <button
            onClick={onOpenFilters}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-white px-3 text-xs font-medium text-[var(--t2)] transition-colors hover:border-dark hover:text-dark lg:hidden"
          >
            <SlidersHorizontal size={14} />
            Фільтри
          </button>
        )}

        {/* Sort select */}
        <select
          value={currentSort}
          onChange={(e) => handleSort(e.target.value)}
          className="h-9 rounded-[10px] border border-[var(--border)] bg-white px-3 pr-8 text-xs font-medium text-[var(--t)] outline-none focus:border-coral/40"
        >
          <option value="popular">Популярні</option>
          <option value="newest">Новинки</option>
          <option value="price_asc">Дешевші</option>
          <option value="price_desc">Дорожчі</option>
          <option value="discount">Зі знижкою</option>
        </select>
      </div>
    </div>
  );
}
