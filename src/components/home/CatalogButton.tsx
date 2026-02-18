"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { useCategoryTree, type CatNode } from "@/hooks/useCategoryTree";
import { useLanguage, localizedName } from "@/hooks/useLanguage";

export function CatalogButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStack, setMenuStack] = useState<CatNode[]>([]);
  const tree = useCategoryTree();
  const { lang } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const closeModal = () => {
    setOpen(false);
    setMenuStack([]);
  };

  const pushCat = (cat: CatNode) => {
    if (cat.children.length > 0) setMenuStack((p) => [...p, cat]);
  };
  const popCat = () => setMenuStack((p) => p.slice(0, -1));

  const currentParent =
    menuStack.length > 0 ? menuStack[menuStack.length - 1] : null;
  const currentItems = currentParent ? currentParent.children : tree;
  const currentTitle = currentParent
    ? localizedName(currentParent, lang)
    : "Каталог товарів";

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[60] flex items-end md:items-stretch md:justify-start">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeModal}
            />
            <div className="relative z-10 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white md:max-h-dvh md:max-w-md md:rounded-none md:rounded-r-2xl">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] px-5 py-4">
                <div className="flex items-center gap-2">
                  {menuStack.length > 0 && (
                    <button
                      onClick={popCat}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#6b6b7b] hover:bg-[#f5f5f5]"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  <h2 className="font-unbounded text-base font-bold text-[#1a1a1a]">
                    {currentTitle}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b7b] hover:bg-[#f5f5f5]"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto">
                {menuStack.length === 0 && (
                  <>
                    <Link
                      href="/catalog?in_stock=true&sort=discount"
                      onClick={closeModal}
                      className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4 hover:bg-[#fff5f6]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold text-coral">
                          Sale
                        </span>
                        <span className="rounded-md bg-coral px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Знижка!!!
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-[#c4c4cc]" />
                    </Link>
                    <Link
                      href="/brands"
                      onClick={closeModal}
                      className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4 hover:bg-[#f8f8f8]"
                    >
                      <span className="text-base font-medium text-[#1a1a1a]">
                        Бренди
                      </span>
                      <ChevronRight size={18} className="text-[#c4c4cc]" />
                    </Link>
                  </>
                )}

                {currentParent && (
                  <Link
                    href={`/catalog/${currentParent.slug}`}
                    onClick={closeModal}
                    className="flex items-center justify-between border-b border-[#f0f0f0] bg-[#fafafa] px-5 py-3 hover:bg-[#f0f0f0]"
                  >
                    <span className="text-sm font-medium text-coral">
                      Дивитись все в &quot;{localizedName(currentParent, lang)}&quot;
                    </span>
                    <ChevronRight size={16} className="text-coral" />
                  </Link>
                )}

                {currentItems.map((cat) =>
                  cat.children.length > 0 ? (
                    <button
                      key={cat.id}
                      onClick={() => pushCat(cat)}
                      className="flex w-full items-center justify-between border-b border-[#f0f0f0] px-5 py-4 text-left hover:bg-[#f8f8f8]"
                    >
                      <span className="text-base font-medium text-[#1a1a1a]">
                        {localizedName(cat, lang)}
                      </span>
                      <ChevronRight size={18} className="text-[#c4c4cc]" />
                    </button>
                  ) : (
                    <Link
                      key={cat.id}
                      href={`/catalog/${cat.slug}`}
                      onClick={closeModal}
                      className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4 hover:bg-[#f8f8f8]"
                    >
                      <span className="text-base text-[#1a1a1a]">
                        {localizedName(cat, lang)}
                      </span>
                      <ChevronRight size={18} className="text-[#c4c4cc]" />
                    </Link>
                  ),
                )}
              </nav>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-coral px-6 py-4 text-[15px] font-bold text-white transition-all hover:bg-[#B8203F] active:scale-[.98]"
      >
        <LayoutGrid size={20} />
        Каталог товарів
      </button>
      {modal}
    </>
  );
}
