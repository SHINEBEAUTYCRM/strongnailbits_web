"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/types/banners";

// ─── Constants ────────────────────────────────────────────
const AUTO_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD = 50;

// ─── Analytics helpers ────────────────────────────────────
function trackView(bannerId: string) {
  fetch(`/api/banners/${bannerId}/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "view" }),
  }).catch(() => {});
}

function trackClick(bannerId: string) {
  fetch(`/api/banners/${bannerId}/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "click" }),
  }).catch(() => {});
}

// ─── Props ────────────────────────────────────────────────
interface HeroSliderProps {
  banners: Banner[];
}

export function HeroSlider({ banners }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  const total = banners.length;

  // ─── Navigation ───────────────────────────────────────
  const goTo = useCallback(
    (index: number) => setCurrent(((index % total) + total) % total),
    [total],
  );
  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // ─── Auto-slide ───────────────────────────────────────
  useEffect(() => {
    if (paused || total <= 1) return;
    const timer = setInterval(next, AUTO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [next, paused, total]);

  // ─── Track views ──────────────────────────────────────
  useEffect(() => {
    if (total === 0) return;
    const banner = banners[current];
    if (!viewedRef.current.has(banner.id)) {
      viewedRef.current.add(banner.id);
      trackView(banner.id);
    }
  }, [current, banners, total]);

  // ─── Guard: no banners ────────────────────────────────
  if (total === 0) return null;

  const banner = banners[current];
  const overlayOpacity = banner.overlay_opacity ?? 0;
  const textColor = banner.text_color || "#ffffff";
  const bgColor = banner.bg_color || "#1a1a2e";

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide container */}
      <div
        className="relative w-full overflow-hidden rounded-none sm:rounded-2xl"
        style={{ backgroundColor: bgColor }}
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX === null) return;
          const delta = touchStartX - e.changedTouches[0].clientX;
          if (Math.abs(delta) > SWIPE_THRESHOLD) {
            delta > 0 ? next() : prev();
          }
          setTouchStartX(null);
        }}
      >
        {/* Image */}
        <div className="relative aspect-[16/6] w-full sm:aspect-[16/5]">
          {/* Desktop image */}
          {banner.image_desktop && (
            <Image
              src={banner.image_desktop}
              alt={banner.image_alt || banner.title}
              fill
              priority={current === 0}
              sizes="100vw"
              className={`object-cover transition-opacity duration-700 ${
                banner.image_mobile ? "hidden sm:block" : "block"
              }`}
            />
          )}

          {/* Mobile image (fallback to desktop) */}
          {banner.image_mobile && (
            <Image
              src={banner.image_mobile}
              alt={banner.image_alt || banner.title}
              fill
              priority={current === 0}
              sizes="100vw"
              className="block object-cover transition-opacity duration-700 sm:hidden"
            />
          )}

          {/* Overlay */}
          {overlayOpacity > 0 && (
            <div
              className="absolute inset-0 z-[1]"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${overlayOpacity / 100})`,
              }}
            />
          )}

          {/* Text content */}
          <div
            className="absolute inset-0 z-[2] flex flex-col justify-center px-6 sm:px-10 lg:px-14"
            style={{ color: textColor }}
          >
            {banner.discount_text && (
              <span
                className="mb-2 inline-block w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur-sm sm:text-sm"
                style={{ color: textColor }}
              >
                {banner.discount_text}
              </span>
            )}

            {banner.heading && (
              <h2 className="max-w-lg whitespace-pre-line text-xl font-black leading-tight sm:text-3xl lg:text-4xl">
                {banner.heading}
              </h2>
            )}

            {banner.subheading && (
              <p className="mt-2 max-w-md whitespace-pre-line text-sm leading-relaxed opacity-80 sm:text-base">
                {banner.subheading}
              </p>
            )}

            {banner.button_text && banner.button_url && (
              <Link
                href={banner.button_url}
                onClick={() => trackClick(banner.id)}
                className="mt-5 inline-flex h-10 w-fit items-center rounded-full bg-white px-6 text-sm font-bold text-[#1a1a1a] transition-all hover:shadow-lg active:scale-[.97] sm:h-11 sm:text-[14px]"
              >
                {banner.button_text}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Arrow — Previous */}
      {total > 1 && (
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-all hover:bg-black/30 sm:flex"
          aria-label="Попередній слайд"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Arrow — Next */}
      {total > 1 && (
        <button
          onClick={next}
          className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition-all hover:bg-black/30 sm:flex"
          aria-label="Наступний слайд"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Dots navigation */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <button
              key={banners[i].id}
              onClick={() => goTo(i)}
              className="flex h-6 w-6 items-center justify-center"
              aria-label={`Слайд ${i + 1}`}
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  i === current
                    ? "h-2.5 w-7 bg-purple-500"
                    : "h-2 w-2 bg-white/50 hover:bg-white/70"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
