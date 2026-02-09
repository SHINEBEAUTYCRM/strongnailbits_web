"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const mainRef = useRef<HTMLDivElement>(null);

  const hasImages = images.length > 0;
  const hasMultiple = images.length > 1;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0) setCurrent(images.length - 1);
      else if (index >= images.length) setCurrent(0);
      else setCurrent(index);
    },
    [images.length],
  );

  const handleSwipe = useCallback(
    (_: never, info: PanInfo) => {
      if (Math.abs(info.offset.x) > 50) {
        if (info.offset.x > 0) goTo(current - 1);
        else goTo(current + 1);
      }
    },
    [current, goTo],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPos({ x, y });
    },
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        ref={mainRef}
        className="relative aspect-square max-h-[350px] w-full cursor-crosshair overflow-hidden rounded-card border border-[var(--border)] bg-sand lg:max-h-[500px]"
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        {hasImages ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative h-full w-full"
              drag={hasMultiple ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleSwipe as (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void}
            >
              <Image
                src={images[current]}
                alt={`${name} — фото ${current + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 55vw"
                className="object-contain p-4 transition-transform duration-300"
                style={
                  zoomed
                    ? {
                        transform: "scale(1.8)",
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      }
                    : undefined
                }
                priority={current === 0}
                unoptimized
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--t3)]">
            <Package size={64} strokeWidth={1} />
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              onClick={() => goTo(current - 1)}
              className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-white/80 p-2 text-[var(--t2)] backdrop-blur-sm transition-all hover:bg-white hover:text-dark md:flex"
              aria-label="Попереднє фото"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goTo(current + 1)}
              className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-white/80 p-2 text-[var(--t2)] backdrop-blur-sm transition-all hover:bg-white hover:text-dark md:flex"
              aria-label="Наступне фото"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {hasMultiple && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 md:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-5 bg-coral" : "w-1.5 bg-dark/20"
                }`}
                aria-label={`Фото ${i + 1}`}
              />
            ))}
          </div>
        )}

        {hasMultiple && (
          <div className="absolute right-3 bottom-3 z-10 hidden rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-[var(--t2)] backdrop-blur-sm md:block">
            {current + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {images.slice(0, 10).map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] border transition-all sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px] ${
                i === current
                  ? "border-coral ring-1 ring-coral/50"
                  : "border-[var(--border)] hover:border-coral/30"
              }`}
            >
              <Image
                src={img}
                alt={`${name} — мініатюра ${i + 1}`}
                fill
                sizes="72px"
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
          {images.length > 10 && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] text-xs text-[var(--t3)] sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]">
              +{images.length - 10}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
