"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { LayoutGrid, ChevronRight } from "lucide-react";
import type { CategoryNode } from "@/lib/categories/tree";

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
  const [activeRoot, setActiveRoot] = useState<CategoryNode | null>(null);
  const [activeCategoryItem, setActiveCategoryItem] =
    useState<CategoryNode | null>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [portalReady, setPortalReady] = useState(false);

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
    if (!activeRoot && categories.length > 0) {
      setActiveRoot(categories[0]);
    }
  }, [cancelTimers, activeRoot, categories]);

  const handleBarCategoryHover = useCallback(
    (cat: CategoryNode) => {
      cancelTimers();
      if (cat.children.length === 0) return;
      openTimer.current = setTimeout(() => {
        setMode("category");
        setActiveCategoryItem(cat);
        setActiveRoot(null);
        setOpen(true);
      }, 120);
    },
    [cancelTimers],
  );

  const handleSidebarHover = useCallback(
    (cat: CategoryNode) => {
      cancelTimers();
      openTimer.current = setTimeout(() => {
        setActiveRoot(cat);
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
              {categories.map((cat) => {
                const isActive = activeRoot?.cs_cart_id === cat.cs_cart_id;
                const hasChildren = cat.children.length > 0;
                return (
                  <Link
                    key={cat.id}
                    href={`/catalog/${cat.slug}`}
                    onMouseEnter={() => handleSidebarHover(cat)}
                    onClick={closeNow}
                    className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-[#D6264A]/10 font-semibold text-[#D6264A]"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                    }`}
                  >
                    <span className="line-clamp-1">{cat.name_uk}</span>
                    {hasChildren && (
                      <ChevronRight
                        size={14}
                        className={`shrink-0 transition-all duration-200 ${
                          isActive
                            ? "translate-x-0.5 text-[#D6264A]"
                            : "text-zinc-700 group-hover:translate-x-0.5 group-hover:text-zinc-400"
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
          {activeRoot && (
            <div key={activeRoot.id}>
              <Link
                href={`/catalog/${activeRoot.slug}`}
                onClick={closeNow}
                className="mb-5 inline-flex items-center gap-1.5 text-base font-bold text-white transition-colors hover:text-[#D6264A]"
              >
                {activeRoot.name_uk}
                <ChevronRight size={16} />
              </Link>

              {activeRoot.children.length > 0 ? (
                <ChildrenGrid items={activeRoot.children} onClose={closeNow} />
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

  const categoryDropdown = activeCategoryItem && (
    <div className="border-b border-zinc-800 bg-[#0a0a0f]">
      <div className="mx-auto max-w-7xl px-6 py-5">
        <Link
          href={`/catalog/${activeCategoryItem.slug}`}
          onClick={closeNow}
          className="mb-4 inline-flex items-center gap-1.5 text-base font-bold text-white transition-colors hover:text-[#D6264A]"
        >
          {activeCategoryItem.name_uk}
          <ChevronRight size={16} />
        </Link>
        <ChildrenGrid items={activeCategoryItem.children} onClose={closeNow} />
      </div>
    </div>
  );

  /* ================================================================ */
  /*  Portal                                                           */
  /* ================================================================ */

  const dropdown =
    portalReady && open
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[49] bg-black/60 animate-[fadeIn_0.15s_ease-out]"
              style={{ top: dropdownTop }}
              onClick={closeNow}
            />
            <div
              className="fixed left-0 right-0 z-[50] shadow-2xl shadow-black/60 animate-[slideDown_0.18s_ease-out]"
              style={{ top: dropdownTop }}
              onMouseEnter={keepOpen}
              onMouseLeave={handleClose}
            >
              {mode === "catalog" ? catalogDropdown : categoryDropdown}
            </div>
          </>,
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
          {/* Каталог button */}
          <button
            onMouseEnter={handleCatalogOpen}
            onClick={() => (open && mode === "catalog" ? closeNow() : handleCatalogOpen())}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              open && mode === "catalog"
                ? "bg-[#D6264A] text-white"
                : "bg-[#b91c3a] text-white hover:bg-[#D6264A]"
            }`}
          >
            <LayoutGrid size={15} />
            Каталог
          </button>

          <div className="mx-1 h-4 w-px bg-zinc-700/50" />

          {/* Menu items — top-level categories */}
          <nav className="flex flex-1 items-center gap-0.5 overflow-hidden">
            {categories.map((cat) => {
              const isActive =
                open &&
                mode === "category" &&
                activeCategoryItem?.cs_cart_id === cat.cs_cart_id;

              return (
                <Link
                  key={cat.id}
                  href={`/catalog/${cat.slug}`}
                  onMouseEnter={() => {
                    if (cat.children.length > 0) {
                      handleBarCategoryHover(cat);
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
                  {cat.name_uk}
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
    <div className="grid grid-cols-3 gap-x-6 gap-y-6 xl:grid-cols-4">
      {items.map((child) => (
          <div
            key={child.id}
            className="border-r border-zinc-800/50 pr-5 last:border-r-0"
          >
            <Link
              href={`/catalog/${child.slug}`}
              onClick={onClose}
            className="mb-2 block border-b border-zinc-800/40 pb-1.5 text-sm font-semibold text-white transition-colors hover:text-[#D6264A]"
            >
            {child.name_uk}
            </Link>
            {child.children.length > 0 && (
              <ul className="flex flex-col gap-0.5">
              {child.children.map((gc) => (
                  <li key={gc.id}>
                    <Link
                      href={`/catalog/${gc.slug}`}
                      onClick={onClose}
                    className="block py-0.5 text-[13px] leading-snug text-zinc-400 transition-colors hover:text-[#D6264A]"
                    >
                    {gc.name_uk}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
      ))}
    </div>
  );
}
