"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { Filters, type BrandFilterItem } from "./Filters";

export interface SubcategoryItem {
  id: string;
  slug: string;
  name_uk: string;
}

interface FilterDrawerProps {
  brands: BrandFilterItem[];
  minPrice?: number;
  maxPrice?: number;
  total: number;
  open: boolean;
  onClose: () => void;
  subcategories?: SubcategoryItem[];
  categoryName?: string;
}

export function FilterDrawer({
  brands,
  minPrice,
  maxPrice,
  open,
  onClose,
  subcategories,
  categoryName,
}: FilterDrawerProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/30"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-sm flex-col bg-pearl"
          >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-5">
              <h2 className="font-unbounded text-sm font-bold text-dark">
                {categoryName || "Фільтри"}
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--t2)] transition-colors hover:text-dark"
                aria-label="Закрити"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Subcategories */}
              {subcategories && subcategories.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-unbounded mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--t3)]">
                    Підкатегорії
                  </h3>
                  <ul className="flex flex-col">
                    {subcategories.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/catalog/${child.slug}`}
                          onClick={onClose}
                          className="flex items-center justify-between border-b border-[var(--border)] py-2.5 text-sm text-[var(--t2)] transition-colors hover:text-coral"
                        >
                          {child.name_uk}
                          <ChevronRight size={14} className="text-[var(--t3)]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Filters */}
              <Filters
                brands={brands}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onApplied={onClose}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
