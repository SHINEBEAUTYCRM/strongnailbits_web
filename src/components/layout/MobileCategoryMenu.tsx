"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  User,
} from "lucide-react";
import type { CategoryNode } from "@/lib/categories/tree";

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
  const [stack, setStack] = useState<StackLevel[]>([]);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (open) {
      setStack([{ title: "Каталог", slug: null, items: categories }]);
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      html.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      html.style.overflow = "";
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
    return () => {
      html.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [open, categories]);

  const current = stack[stack.length - 1];

  function pushLevel(cat: CategoryNode) {
    setStack((s) => [
      ...s,
      { title: cat.name_uk, slug: cat.slug, items: cat.children },
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
                  <div className="flex h-8 w-8 items-center justify-center text-[#D6264A]">
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
                className="flex items-center gap-2 border-b border-zinc-800/50 px-5 py-3 text-sm font-medium text-[#D6264A] transition-colors hover:text-[#b91c3a]"
              >
                Дивитися все в &quot;{current.title}&quot;
              </Link>
            )}

            {/* Category list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                <div
                  key={stack.length}
                  className="flex flex-col"
                >
                  {current?.items.map((cat) => {
                    const hasChildren = cat.children.length > 0;

                    return (
                      <div key={cat.id} className="border-b border-zinc-800/30">
                        {hasChildren ? (
                          <button
                            onClick={() => pushLevel(cat)}
                            className="flex w-full items-center justify-between px-5 py-3.5 text-left text-base text-zinc-300 transition-all hover:bg-zinc-900 hover:text-white"
                          >
                            <span className="line-clamp-1">{cat.name_uk}</span>
                            <ChevronRight size={14} className="shrink-0 text-zinc-600" />
                          </button>
                        ) : (
                          <Link
                            href={`/catalog/${cat.slug}`}
                            onClick={onClose}
                            className="flex w-full items-center justify-between px-5 py-3.5 text-base text-zinc-300 transition-all hover:bg-zinc-900 hover:text-white"
                          >
                            <span className="line-clamp-1">{cat.name_uk}</span>
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
