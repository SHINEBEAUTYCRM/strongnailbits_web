"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Package, ShoppingBag, Users, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const navigate = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[600px] mx-4 bg-[#0a0a0f] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <Search className="w-5 h-5 text-white/40 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук товарів, замовлень, клієнтів..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none"
          />
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results area */}
        <div className="px-5 py-6 max-h-[400px] overflow-y-auto">
          {!query ? (
            <div className="text-center text-white/30 text-sm py-8">
              <p>Почніть вводити для пошуку</p>
              <p className="mt-2 text-xs text-white/20">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 font-mono text-xs">
                  ⌘K
                </kbd>{" "}
                щоб відкрити пошук
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">
                  Швидкі переходи
                </p>
                <div className="space-y-1">
                  <QuickLink
                    icon={Package}
                    label={`Шукати "${query}" в товарах`}
                    onClick={() =>
                      navigate(`/admin/products?search=${encodeURIComponent(query)}`)
                    }
                  />
                  <QuickLink
                    icon={ShoppingBag}
                    label={`Шукати "${query}" в замовленнях`}
                    onClick={() =>
                      navigate(`/admin/orders?search=${encodeURIComponent(query)}`)
                    }
                  />
                  <QuickLink
                    icon={Users}
                    label={`Шукати "${query}" в клієнтах`}
                    onClick={() =>
                      navigate(`/admin/clients?search=${encodeURIComponent(query)}`)
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06] text-[11px] text-white/20">
          <span>Глобальний пошук</span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30 font-mono">
              ESC
            </kbd>{" "}
            щоб закрити
          </span>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Package;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all duration-150 text-left"
    >
      <Icon className="w-4 h-4 text-white/30 shrink-0" />
      {label}
    </button>
  );
}
