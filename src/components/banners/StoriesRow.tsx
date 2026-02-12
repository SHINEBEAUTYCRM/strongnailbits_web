"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/types/banners";

// ─── Constants ────────────────────────────────────────────
const AUTO_ADVANCE_MS = 5000;
const SEEN_KEY = "shineshop_seen_stories";

// ─── Seen stories helpers ─────────────────────────────────
function getSeenStories(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markSeen(id: string) {
  try {
    const seen = getSeenStories();
    if (!seen.includes(id)) {
      seen.push(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    }
  } catch {
    // localStorage unavailable
  }
}

// ─── Analytics ────────────────────────────────────────────
function trackView(bannerId: string) {
  fetch(`/api/banners/${bannerId}/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "view" }),
  }).catch(() => {});
}

// ─── Props ────────────────────────────────────────────────
interface StoriesRowProps {
  banners: Banner[];
}

export function StoriesRow({ banners }: StoriesRowProps) {
  const [seen, setSeen] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load seen stories
  useEffect(() => {
    setSeen(getSeenStories());
  }, []);

  const total = banners.length;

  // ─── Open story ───────────────────────────────────────
  const openStory = useCallback(
    (index: number) => {
      setActiveIndex(index);
      setProgress(0);

      const banner = banners[index];
      if (banner && !viewedRef.current.has(banner.id)) {
        viewedRef.current.add(banner.id);
        trackView(banner.id);
      }

      markSeen(banner.id);
      setSeen((prev) => (prev.includes(banner.id) ? prev : [...prev, banner.id]));
    },
    [banners],
  );

  // ─── Close story ──────────────────────────────────────
  const closeStory = useCallback(() => {
    setActiveIndex(null);
    setProgress(0);
  }, []);

  // ─── Navigate ─────────────────────────────────────────
  const goNext = useCallback(() => {
    if (activeIndex === null) return;
    if (activeIndex < total - 1) {
      openStory(activeIndex + 1);
    } else {
      closeStory();
    }
  }, [activeIndex, total, openStory, closeStory]);

  const goPrev = useCallback(() => {
    if (activeIndex === null) return;
    if (activeIndex > 0) {
      openStory(activeIndex - 1);
    }
  }, [activeIndex, openStory]);

  // ─── Auto-advance timer ───────────────────────────────
  useEffect(() => {
    if (activeIndex === null) return;

    // Progress bar interval (update every 50ms)
    const TICK = 50;
    let elapsed = 0;

    progressRef.current = setInterval(() => {
      elapsed += TICK;
      setProgress(Math.min((elapsed / AUTO_ADVANCE_MS) * 100, 100));
    }, TICK);

    // Auto-advance
    timerRef.current = setTimeout(() => {
      goNext();
    }, AUTO_ADVANCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [activeIndex, goNext]);

  // ─── Keyboard navigation ──────────────────────────────
  useEffect(() => {
    if (activeIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStory();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, closeStory, goNext, goPrev]);

  // ─── Lock body scroll when fullscreen ─────────────────
  useEffect(() => {
    if (activeIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeIndex]);

  if (total === 0) return null;

  const activeBanner = activeIndex !== null ? banners[activeIndex] : null;

  return (
    <>
      {/* ─── Stories row (thumbnails) ─────────────────── */}
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-3 overflow-x-auto px-1 py-2 sm:gap-4"
      >
        {banners.map((banner, i) => {
          const isSeen = seen.includes(banner.id);
          const thumb = banner.image_mobile || banner.image_desktop;

          return (
            <button
              key={banner.id}
              onClick={() => openStory(i)}
              className="flex flex-shrink-0 flex-col items-center gap-1.5"
            >
              {/* Ring + thumbnail */}
              <div
                className={`flex items-center justify-center rounded-full p-[3px] ${
                  isSeen
                    ? "bg-gray-300"
                    : "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400"
                }`}
              >
                <div className="h-16 w-16 overflow-hidden rounded-full bg-white p-[2px] sm:h-20 sm:w-20">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={banner.image_alt || banner.title}
                      width={80}
                      height={80}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: banner.bg_color || "#7c3aed",
                        color: banner.text_color || "#fff",
                      }}
                    >
                      {banner.title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <span className="max-w-[68px] truncate text-[10px] text-gray-600 sm:max-w-[84px] sm:text-xs">
                {banner.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Fullscreen overlay ───────────────────────── */}
      {activeBanner && activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={(e) => {
            // Close if clicking backdrop
            if (e.target === e.currentTarget) closeStory();
          }}
        >
          {/* Story card */}
          <div className="relative flex h-full w-full max-w-[420px] flex-col sm:h-[90vh] sm:rounded-2xl sm:overflow-hidden">
            {/* Progress bars */}
            <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-3 pt-3">
              {banners.map((_, i) => (
                <div
                  key={banners[i].id}
                  className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
                >
                  <div
                    className="h-full rounded-full bg-white transition-all duration-100 ease-linear"
                    style={{
                      width:
                        i < activeIndex
                          ? "100%"
                          : i === activeIndex
                            ? `${progress}%`
                            : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Close button */}
            <button
              onClick={closeStory}
              className="absolute right-3 top-8 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
              aria-label="Закрити"
            >
              <X size={18} />
            </button>

            {/* Story image */}
            <div className="relative flex-1 bg-black">
              {(activeBanner.image_mobile || activeBanner.image_desktop) && (
                <Image
                  src={activeBanner.image_mobile || activeBanner.image_desktop!}
                  alt={activeBanner.image_alt || activeBanner.title}
                  fill
                  sizes="420px"
                  className="object-contain"
                  priority
                />
              )}

              {/* Overlay */}
              {activeBanner.overlay_opacity > 0 && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: `rgba(0, 0, 0, ${activeBanner.overlay_opacity / 100})`,
                  }}
                />
              )}

              {/* Text overlay (bottom) */}
              <div
                className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-5 pb-6 pt-16"
                style={{ color: activeBanner.text_color || "#ffffff" }}
              >
                {activeBanner.heading && (
                  <h3 className="text-lg font-bold leading-tight sm:text-xl">
                    {activeBanner.heading}
                  </h3>
                )}
                {activeBanner.subheading && (
                  <p className="mt-1 text-sm opacity-80">
                    {activeBanner.subheading}
                  </p>
                )}
                {activeBanner.button_text && activeBanner.button_url && (
                  <a
                    href={activeBanner.button_url}
                    className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-5 text-sm font-bold text-[#1a1a1a] transition-all hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {activeBanner.button_text}
                  </a>
                )}
              </div>

              {/* Tap zones for prev/next */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute inset-y-0 left-0 z-10 w-1/3"
                aria-label="Попередня"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute inset-y-0 right-0 z-10 w-1/3"
                aria-label="Наступна"
              />
            </div>

            {/* Desktop arrows */}
            {activeIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute -left-14 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30 sm:flex"
                aria-label="Попередня"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {activeIndex < total - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute -right-14 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30 sm:flex"
                aria-label="Наступна"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
