"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  X,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  User,
  Tag,
} from "lucide-react";
import type { CategoryNode } from "@/lib/categories/tree";
import { MAIN_MENU_ITEMS } from "@/lib/config/menu";
import { useLanguage, localizedName } from "@/hooks/useLanguage";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function findByCsCartId(
  nodes: CategoryNode[],
  id: number,
): CategoryNode | null {
  for (const node of nodes) {
    if (node.cs_cart_id === id) return node;
    const found = findByCsCartId(node.children, id);
    if (found) return found;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MobileCategoryMenuProps {
  open: boolean;
  onClose: () => void;
  categories: CategoryNode[];
}

interface StackLevel {
  title: string;
  slug: string | null;
  items: CategoryNode[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MobileCategoryMenu({
  open,
  onClose,
  categories,
}: MobileCategoryMenuProps) {
  const { lang } = useLanguage();
  const [stack, setStack] = useState<StackLevel[]>([]);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const menuNodes = useMemo(() => {
    const nodes: CategoryNode[] = [];

    for (const item of MAIN_MENU_ITEMS) {
      if (item.type === "link") {
        nodes.push({
          id: `link-${item.href}`,
          slug: item.href.replace(/^\//, ""),
          name_uk: item.label,
          name_ru: null,
          cs_cart_id: 0,
          parent_cs_cart_id: null,
          position: 0,
          product_count: 0,
          total_product_count: 0,
          children: [],
          ...({ _href: item.href, _highlight: item.highlight } as Record<string, unknown>),
        } as CategoryNode & { _href?: string; _highlight?: boolean });
        continue;
      }

      const node = findByCsCartId(categories, item.csCartId);
      if (node) {
        nodes.push({ ...node, name_uk: item.label });
      } else {
        nodes.push({
          id: `fallback-${item.csCartId}`,
          slug: item.fallbackSlug,
          name_uk: item.label,
          name_ru: null,
          cs_cart_id: item.csCartId,
          parent_cs_cart_id: null,
          position: 0,
          product_count: 0,
          total_product_count: 0,
          children: [],
        });
      }
    }

    return nodes;
  }, [categories]);

  useEffect(() => {
    if (open) {
      setStack([{ title: "Каталог", slug: null, items: menuNodes }]);
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, menuNodes]);

  const current = stack[stack.length - 1];

  function pushLevel(cat: CategoryNode) {
    setStack((s) => [
      ...s,
      { title: localizedName(cat, lang), slug: cat.slug, items: cat.children },
    ]);
  }

  function popLevel() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  if (!mounted) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-[70] flex w-full max-w-sm flex-col bg-[#08080c] transition-transform duration-300 ease-out md:hidden ${
          visible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
              <div className="flex items-center gap-2">
                {stack.length > 1 ? (
                  <button
                    onClick={popLevel}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-zinc-800/50 hover:text-white"
                  >
                    <ChevronLeft size={18} />
                  </button>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center text-purple-400">
                    <LayoutGrid size={18} />
                  </div>
                )}
                <span className="text-sm font-semibold text-white line-clamp-1">
                  {current?.title ?? "Каталог"}
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-zinc-800/50 hover:text-white"
                aria-label="Закрити"
              >
                <X size={18} />
              </button>
            </div>

            {/* "View all" link for subcategories */}
            {stack.length > 1 && current?.slug && (
              <Link
                href={`/catalog/${current.slug}`}
                onClick={onClose}
                className="flex items-center gap-2 border-b border-zinc-800/50 px-5 py-3 text-sm font-medium text-purple-400 transition-colors hover:text-purple-300"
              >
                Дивитися все в &quot;{current.title}&quot;
              </Link>
            )}

            {/* Category list */}
            <div className="flex-1 overflow-y-auto">
                <div
                  key={stack.length}
                  className="flex flex-col"
                >
                  {current?.items.map((cat) => {
                    const hasChildren = cat.children.length > 0;
                    const isHighlight = (cat as CategoryNode & { _highlight?: boolean })._highlight;
                    const directHref = (cat as CategoryNode & { _href?: string })._href;

                    if (directHref) {
                      return (
                        <div key={cat.id} className="border-b border-zinc-800/30">
                          <Link
                            href={directHref}
                            onClick={onClose}
                            className={`flex w-full items-center gap-2 px-5 py-3.5 text-base transition-all hover:bg-zinc-900 ${
                              isHighlight
                                ? "font-semibold sale-text"
                                : "text-zinc-300 hover:text-white"
                            }`}
                          >
                            {isHighlight && <Tag size={14} className="text-pink-400" />}
                            {localizedName(cat, lang)}
                          </Link>
                        </div>
                      );
                    }

                    return (
                      <div key={cat.id} className="border-b border-zinc-800/30">
                        {hasChildren ? (
                          <button
                            onClick={() => pushLevel(cat)}
                            className="flex w-full items-center justify-between px-5 py-3.5 text-left text-base text-zinc-300 transition-all hover:bg-zinc-900 hover:text-white"
                          >
                            <span className="line-clamp-1">{localizedName(cat, lang)}</span>
                            <ChevronRight size={14} className="shrink-0 text-zinc-600" />
                          </button>
                        ) : (
                          <Link
                            href={`/catalog/${cat.slug}`}
                            onClick={onClose}
                            className="flex w-full items-center justify-between px-5 py-3.5 text-base text-zinc-300 transition-all hover:bg-zinc-900 hover:text-white"
                          >
                            <span className="line-clamp-1">{localizedName(cat, lang)}</span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 px-5 py-4">
              <div className="flex flex-col gap-1">
                <Link
                  href="/account"
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:bg-zinc-800/50 hover:text-white"
                >
                  <User size={14} />
                  Мій акаунт
                </Link>
              </div>
            </div>
      </div>
    </>
  );
}
