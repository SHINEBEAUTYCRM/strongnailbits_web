"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { X, Copy, Check } from "lucide-react";
import type { Banner } from "@/types/banners";

// ─── localStorage key for dismissed banners ──────────────
const DISMISSED_KEY = "shineshop_dismissed_promos";

function getDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function addDismissed(id: string) {
  try {
    const dismissed = getDismissed();
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // localStorage unavailable
  }
}

// ─── Props ────────────────────────────────────────────────
interface PromoStripProps {
  banners: Banner[];
}

export function PromoStrip({ banners }: PromoStripProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read dismissed IDs from localStorage on mount
  useEffect(() => {
    setDismissed(getDismissed());
    setMounted(true);
  }, []);

  // Pick the highest-priority visible banner
  const banner = useMemo(() => {
    if (!mounted) return null;
    const sorted = [...banners]
      .filter((b) => !dismissed.includes(b.id))
      .sort((a, b) => b.priority - a.priority);
    return sorted[0] ?? null;
  }, [banners, dismissed, mounted]);

  // ─── Copy promo code ──────────────────────────────────
  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  // ─── Dismiss ──────────────────────────────────────────
  const handleDismiss = () => {
    if (!banner) return;
    setClosing(true);
    setTimeout(() => {
      addDismissed(banner.id);
      setDismissed((prev) => [...prev, banner.id]);
      setClosing(false);
    }, 300);
  };

  // ─── Guard ────────────────────────────────────────────
  if (!banner) return null;

  const bgColor = banner.bg_color || "#7c3aed";
  const textColor = banner.text_color || "#ffffff";
  const displayText = banner.heading || banner.subheading || banner.title;

  return (
    <div
      className={`relative flex h-10 w-full items-center justify-center overflow-hidden px-10 transition-all duration-300 ${
        closing ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* Content */}
      <div className="flex items-center gap-2 text-xs font-medium sm:gap-3 sm:text-sm">
        {banner.button_url ? (
          <Link href={banner.button_url} className="hover:underline">
            {displayText}
          </Link>
        ) : (
          <span>{displayText}</span>
        )}

        {/* Promo code badge */}
        {banner.promo_code && (
          <button
            onClick={() => handleCopy(banner.promo_code!)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-white/15 px-2.5 py-0.5 text-xs font-bold backdrop-blur-sm transition-colors hover:bg-white/25"
            title="Копіювати промокод"
          >
            <span className="font-mono tracking-wider">
              {banner.promo_code}
            </span>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}

        {/* Discount text */}
        {banner.discount_text && !banner.promo_code && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:text-xs">
            {banner.discount_text}
          </span>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-white/20"
        aria-label="Закрити"
      >
        <X size={14} />
      </button>
    </div>
  );
}
