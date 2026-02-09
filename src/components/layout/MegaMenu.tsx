"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, ChevronRight } from "lucide-react";
import type { CategoryNode } from "@/lib/categories/tree";
import {
  MAIN_MENU_ITEMS,
  type MenuItemCategory,
} from "@/lib/config/menu";

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

interface ResolvedCategory {
  item: MenuItemCategory;
  node: CategoryNode | null;
  slug: string;
  href: string;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DropdownMode = "catalog" | "category";

interface MegaMenuProps {
  categories: CategoryNode[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MegaMenu({ categories }: MegaMenuProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DropdownMode>("catalog");
  const [activeRoot, setActiveRoot] = useState<ResolvedCategory | null>(null);
  const [activeCategoryItem, setActiveCategoryItem] =
    useState<ResolvedCategory | null>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [portalReady, setPortalReady] = useState(false);

  /* ---- Resolve ALL menu category items ---- */

  const resolvedCategories = useMemo(() => {
    const map = new Map<number, ResolvedCategory>();
    for (const item of MAIN_MENU_ITEMS) {
      if (item.type !== "category") continue;
      const node = findByCsCartId(categories, item.csCartId);
      const slug = node?.slug ?? item.fallbackSlug;
      map.set(item.csCartId, { item, node, slug, href: `/catalog/${slug}` });
    }
    return map;
  }, [categories]);

  const catalogSidebarItems = useMemo(() => {
    const items: ResolvedCategory[] = [];
    for (const item of MAIN_MENU_ITEMS) {
      if (item.type !== "category") continue;
      const resolved = resolvedCategories.get(item.csCartId);
      if (resolved) items.push(resolved);
    }
    return items;
  }, [resolvedCategories]);

  /* ---- Portal ready ---- */
  useEffect(() => {
    setPortalReady(true);
  }, []);

  /* ---- Measure bar position ---- */
  useEffect(() => {
    if (!open || !barRef.current) return;
    setDropdownTop(barRef.current.getBoundingClientRect().bottom);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (barRef.current) {
        setDropdownTop(barRef.current.getBoundingClientRect().bottom);
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  /* ---- Timer helpers ---- */
  const cancelTimers = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
  }, []);

  const handleClose = useCallback(() => {
    cancelTimers();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setActiveRoot(null);
      setActiveCategoryItem(null);
    }, 300);
  }, [cancelTimers]);

  const keepOpen = useCallback(() => {
    cancelTimers();
  }, [cancelTimers]);

  const closeNow = useCallback(() => {
    cancelTimers();
    setOpen(false);
    setActiveRoot(null);
    setActiveCategoryItem(null);
  }, [cancelTimers]);

  const handleCatalogOpen = useCallback(() => {
    cancelTimers();
    setMode("catalog");
    setActiveCategoryItem(null);
    setOpen(true);
    if (!activeRoot && catalogSidebarItems.length > 0) {
      setActiveRoot(catalogSidebarItems[0]);
    }
  }, [cancelTimers, activeRoot, catalogSidebarItems]);

  const handleBarCategoryHover = useCallback(
    (resolved: ResolvedCategory) => {
      cancelTimers();
      if (!resolved.node || resolved.node.children.length === 0) return;
      openTimer.current = setTimeout(() => {
        setMode("category");
        setActiveCategoryItem(resolved);
        setActiveRoot(null);
        setOpen(true);
      }, 120);
    },
    [cancelTimers],
  );

  const handleSidebarHover = useCallback(
    (resolved: ResolvedCategory) => {
      cancelTimers();
      openTimer.current = setTimeout(() => {
        setActiveRoot(resolved);
      }, 80);
    },
    [cancelTimers],
  );

  /* ---- Escape key ---- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeNow]);

  /* ================================================================ */
  /*  Dropdown: "catalog" mode                                         */
  /* ================================================================ */

  const catalogDropdown = (
    <div className="border-b border-zinc-800 bg-[#0a0a0f]">
      <div className="mx-auto flex max-w-7xl px-6">
        <div className="w-56 shrink-0 border-r border-zinc-800/50 py-4 pr-3">
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col gap-0.5">
              {catalogSidebarItems.map((resolved) => {
                const isActive = activeRoot?.item.csCartId === resolved.item.csCartId;
                const hasChildren = (resolved.node?.children.length ?? 0) > 0;
                return (
                  <Link
                    key={resolved.item.csCartId}
                    href={resolved.href}
                    onMouseEnter={() => handleSidebarHover(resolved)}
                    onClick={closeNow}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-zinc-800 font-semibold text-white"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    }`}
                  >
                    <span className="line-clamp-1">{resolved.item.label}</span>
                    {hasChildren && (
                      <ChevronRight
                        size={14}
                        className={`shrink-0 transition-colors ${
                          isActive ? "text-purple-400" : "text-zinc-700"
                        }`}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-h-[65vh] flex-1 overflow-y-auto py-5 pl-8 pr-2">
          {activeRoot?.node && (
            <div key={activeRoot.item.csCartId}>
              <Link
                href={activeRoot.href}
                onClick={closeNow}
                className="mb-5 inline-flex items-center gap-1.5 text-base font-bold text-white transition-colors hover:text-purple-400"
              >
                {activeRoot.item.label}
                <ChevronRight size={16} />
              </Link>

              {activeRoot.node.children.length > 0 ? (
                <ChildrenGrid items={activeRoot.node.children} onClose={closeNow} />
              ) : (
                <p className="text-sm text-zinc-500">
                  Перейдіть до категорії для перегляду товарів
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ================================================================ */
  /*  Dropdown: "category" mode                                        */
  /* ================================================================ */

  const categoryDropdown = activeCategoryItem?.node && (
    <div className="border-b border-zinc-800 bg-[#0a0a0f]">
      <div className="mx-auto max-w-7xl px-6 py-5">
        <Link
          href={activeCategoryItem.href}
          onClick={closeNow}
          className="mb-4 inline-flex items-center gap-1.5 text-base font-bold text-white transition-colors hover:text-purple-400"
        >
          {activeCategoryItem.item.label}
          <ChevronRight size={16} />
        </Link>
        <ChildrenGrid items={activeCategoryItem.node.children} onClose={closeNow} />
      </div>
    </div>
  );

  /* ================================================================ */
  /*  Portal                                                           */
  /* ================================================================ */

  const dropdown =
    portalReady && open
      ? createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  key="mega-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-[49] bg-black/60"
                  style={{ top: dropdownTop }}
                  onClick={closeNow}
                />
                <motion.div
                  key="mega-dropdown"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="fixed left-0 right-0 z-[50] shadow-2xl shadow-black/60"
                  style={{ top: dropdownTop }}
                  onMouseEnter={keepOpen}
                  onMouseLeave={handleClose}
                >
                  {mode === "catalog" ? catalogDropdown : categoryDropdown}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )
      : null;

  /* ================================================================ */
  /*  Render bar                                                       */
  /* ================================================================ */

  return (
    <>
      <div
        ref={barRef}
        className="hidden h-11 border-b border-zinc-800/50 bg-zinc-900/80 backdrop-blur-sm md:block"
        onMouseLeave={handleClose}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center gap-1 px-6">
          {/* Каталог button — purple */}
          <button
            onMouseEnter={handleCatalogOpen}
            onClick={() => (open && mode === "catalog" ? closeNow() : handleCatalogOpen())}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              open && mode === "catalog"
                ? "bg-purple-500 text-white"
                : "bg-purple-600 text-white hover:bg-purple-500"
            }`}
          >
            <LayoutGrid size={15} />
            Каталог
          </button>

          <div className="mx-1 h-4 w-px bg-zinc-700/50" />

          {/* Menu items */}
          <nav className="flex flex-1 items-center gap-0.5 overflow-hidden">
            {MAIN_MENU_ITEMS.map((item, idx) => {
              if (item.type === "link") {
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    onMouseEnter={() => {
                      cancelTimers();
                      if (open) {
                        closeTimer.current = setTimeout(() => {
                          setOpen(false);
                          setActiveRoot(null);
                          setActiveCategoryItem(null);
                        }, 200);
                      }
                    }}
                    className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      item.highlight
                        ? "sale-text font-semibold"
                        : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }

              const resolved = resolvedCategories.get(item.csCartId);
              if (!resolved) return null;

              const isActive =
                open &&
                mode === "category" &&
                activeCategoryItem?.item.csCartId === item.csCartId;

              return (
                <Link
                  key={idx}
                  href={resolved.href}
                  onMouseEnter={() => {
                    if (resolved.node && resolved.node.children.length > 0) {
                      handleBarCategoryHover(resolved);
                    } else {
                      cancelTimers();
                      if (open) {
                        closeTimer.current = setTimeout(() => {
                          setOpen(false);
                          setActiveRoot(null);
                          setActiveCategoryItem(null);
                        }, 200);
                      }
                    }
                  }}
                  onClick={closeNow}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-normal whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {dropdown}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared: children grid component                                    */
/* ------------------------------------------------------------------ */

function ChildrenGrid({
  items,
  onClose,
}: {
  items: CategoryNode[];
  onClose: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-x-8 gap-y-6 xl:grid-cols-4">
      {items.map((child) => (
        <div key={child.id}>
          <Link
            href={`/catalog/${child.slug}`}
            onClick={onClose}
            className="mb-2 block text-sm font-semibold text-white transition-colors hover:text-purple-400"
          >
            {child.name_uk}
          </Link>
          {child.children.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {child.children.slice(0, 8).map((gc) => (
                <li key={gc.id}>
                  <Link
                    href={`/catalog/${gc.slug}`}
                    onClick={onClose}
                    className="block text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    {gc.name_uk}
                  </Link>
                </li>
              ))}
              {child.children.length > 8 && (
                <li>
                  <Link
                    href={`/catalog/${child.slug}`}
                    onClick={onClose}
                    className="text-xs font-medium text-purple-400 transition-colors hover:text-pink-400"
                  >
                    Дивитися все ({child.children.length})
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
