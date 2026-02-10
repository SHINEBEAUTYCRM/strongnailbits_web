"use client";

// ================================================================
//  CategoryFilter — Фільтр по категоріях сервісів
// ================================================================

import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ORDER, type ServiceCategory } from "@/lib/integrations/types";

interface CategoryFilterProps {
  selected: ServiceCategory | "all";
  onSelect: (category: ServiceCategory | "all") => void;
  counts: Record<string, number>;
}

export function CategoryFilter({ selected, onSelect, counts }: CategoryFilterProps) {
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-wrap gap-2">
      <FilterButton
        label="Всі"
        count={totalCount}
        isActive={selected === "all"}
        onClick={() => onSelect("all")}
      />
      {SERVICE_CATEGORY_ORDER.map(cat => {
        const count = counts[cat] || 0;
        if (count === 0) return null;
        return (
          <FilterButton
            key={cat}
            label={SERVICE_CATEGORY_LABELS[cat]}
            count={count}
            isActive={selected === cat}
            onClick={() => onSelect(cat)}
          />
        );
      })}
    </div>
  );
}

function FilterButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        isActive
          ? "bg-purple-600 text-white"
          : "bg-[#111116] text-zinc-400 border border-[#1e1e2a] hover:border-[#27272a] hover:text-zinc-300"
      }`}
    >
      {label}
      <span
        className={`text-[10px] px-1 rounded ${
          isActive ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
