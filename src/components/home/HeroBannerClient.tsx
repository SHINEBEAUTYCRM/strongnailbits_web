"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "./HeroBanner";

const AUTO_MS = 5000;

interface Props {
  slides: readonly HeroSlide[];
}

export function HeroBannerClient({ slides }: Props) {
  const [cur, setCur] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (i: number) =>
      setCur(((i % slides.length) + slides.length) % slides.length),
    [slides.length],
  );
  const next = useCallback(() => goTo(cur + 1), [cur, goTo]);
  const prev = useCallback(() => goTo(cur - 1), [cur, goTo]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, AUTO_MS);
    return () => clearInterval(t);
  }, [next, paused]);

  const slide = slides[cur];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`relative overflow-hidden rounded-2xl ${slide.bg} px-6 py-10 text-white transition-all duration-500 sm:px-10 sm:py-14 lg:px-12 lg:py-16`}
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const d = touchX - e.changedTouches[0].clientX;
          if (Math.abs(d) > 50) d > 0 ? next() : prev();
          setTouchX(null);
        }}
      >
        <div className="relative z-10" key={cur}>
          <h1 className="font-unbounded whitespace-pre-line text-[22px] font-black leading-tight sm:text-3xl lg:text-4xl">
            {slide.title}
          </h1>
          <p className="mt-3 max-w-md whitespace-pre-line text-[13px] leading-relaxed text-white/80 sm:text-[15px]">
            {slide.subtitle}
          </p>
          <Link
            href={slide.href}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-white px-6 text-[14px] font-bold text-[#1a1a1a] transition-all hover:shadow-lg active:scale-[.97]"
          >
            {slide.cta}
          </Link>
        </div>

        {/* Decorative */}
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 right-10 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute right-1/4 top-1/3 h-16 w-16 rounded-full bg-white/5" />

        {/* Arrows (desktop) */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30 sm:flex"
          aria-label="Попередній"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={next}
          className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30 sm:flex"
          aria-label="Наступний"
        >
          <ChevronRight size={20} />
        </button>

        {/* Dots — min 24px tap area for accessibility */}
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="flex h-6 w-6 items-center justify-center"
              aria-label={`Слайд ${i + 1}`}
            >
              <span
                className={`block h-2 rounded-full transition-all ${
                  i === cur
                    ? "w-7 bg-white"
                    : "w-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
