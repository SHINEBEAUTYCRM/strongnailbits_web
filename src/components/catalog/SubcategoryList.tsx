"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChildCategoryInfo } from "@/lib/catalog/filters";
import type { Lang } from "@/lib/language";
import { localizedName } from "@/lib/language";

const VISIBLE_LIMIT = 5;

interface SubcategoryListProps {
  children: ChildCategoryInfo[];
  lang: Lang;
}

export function SubcategoryList({ children, lang }: SubcategoryListProps) {
  const [expanded, setExpanded] = useState(false);

  if (children.length === 0) return null;

  const visible = expanded || children.length <= VISIBLE_LIMIT
    ? children
    : children.slice(0, VISIBLE_LIMIT);

  return (
    <div className="mb-6 rounded-card border border-[var(--border)] bg-white">
      {visible.map((child, i) => (
        <Link
          key={child.id}
          href={`/catalog/${child.slug}`}
          className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg2)] ${
            i < visible.length - 1 || (!expanded && children.length > VISIBLE_LIMIT)
              ? "border-b border-[var(--border)]"
              : ""
          }`}
        >
          <span className="min-w-0 flex-1 text-sm font-medium text-[var(--t1)]">
            {localizedName(child, lang)}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-[var(--t3)]">
            {child.product_count}
          </span>
          <svg
            className="h-4 w-4 shrink-0 text-[var(--t3)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ))}

      {!expanded && children.length > VISIBLE_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full px-4 py-3 text-center text-sm font-medium text-coral transition-colors hover:bg-[var(--bg2)]"
        >
          Показати всі ({children.length})
        </button>
      )}
    </div>
  );
}
