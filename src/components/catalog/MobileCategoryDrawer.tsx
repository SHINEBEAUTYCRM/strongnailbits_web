"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { SidebarTree } from "./SidebarTree";

interface CategoryNode {
  id: string;
  slug: string;
  name_uk: string;
  cs_cart_id: number;
  parent_cs_cart_id: number | null;
  product_count: number;
  children: CategoryNode[];
}

interface MobileCategoryDrawerProps {
  tree: CategoryNode[];
  currentSlug?: string;
}

export function MobileCategoryDrawer({ tree, currentSlug }: MobileCategoryDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-white/[0.12] hover:bg-white/[0.05] lg:hidden"
      >
        <SlidersHorizontal size={16} />
        Категорії
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform bg-[var(--bg-primary)] border-r border-white/[0.06] transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Категорії
          </h3>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-all hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
            aria-label="Закрити"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(100dvh - 57px)" }}>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={() => setOpen(false)}>
            <SidebarTree tree={tree} currentSlug={currentSlug} />
          </div>
        </div>
      </div>
    </>
  );
}
