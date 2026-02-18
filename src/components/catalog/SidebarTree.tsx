"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLanguage, localizedName } from "@/hooks/useLanguage";

interface CategoryNode {
  id: string;
  slug: string;
  name_uk: string;
  cs_cart_id: number;
  parent_cs_cart_id: number | null;
  product_count: number;
  children: CategoryNode[];
}

interface SidebarTreeProps {
  tree: CategoryNode[];
  currentSlug?: string;
  level?: number;
}

export function SidebarTree({ tree, currentSlug, level = 0 }: SidebarTreeProps) {
  return (
    <ul className={level > 0 ? "ml-3 mt-1 border-l border-white/[0.06] pl-3" : "flex flex-col gap-0.5"}>
      {tree.map((node) => (
        <SidebarItem key={node.id} node={node} currentSlug={currentSlug} level={level} />
      ))}
    </ul>
  );
}

function SidebarItem({
  node,
  currentSlug,
  level,
}: {
  node: CategoryNode;
  currentSlug?: string;
  level: number;
}) {
  const { lang } = useLanguage();
  const isActive = node.slug === currentSlug;
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(
    isActive || node.children.some((c) => c.slug === currentSlug),
  );

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={`/catalog/${node.slug}`}
          className={`flex-1 rounded-lg px-2.5 py-1.5 text-sm transition-all ${
            isActive
              ? "bg-white/[0.06] font-medium text-white"
              : "text-[var(--text-muted)] hover:bg-white/[0.03] hover:text-[var(--text-secondary)]"
          }`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="line-clamp-1">{localizedName(node, lang)}</span>
            {node.product_count > 0 && (
              <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                {node.product_count}
              </span>
            )}
          </span>
        </Link>
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition-all hover:bg-white/[0.04] hover:text-[var(--text-secondary)]"
            aria-label={expanded ? "Згорнути" : "Розгорнути"}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${expanded ? "rotate-0" : "-rotate-90"}`}
            />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <SidebarTree tree={node.children} currentSlug={currentSlug} level={level + 1} />
      )}
    </li>
  );
}
