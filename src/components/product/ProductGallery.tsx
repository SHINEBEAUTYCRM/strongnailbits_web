"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
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
  const [touchX, setTouchX] = useState<number | null>(null);

  const hasImages = images.length > 0;
  const hasMultiple = images.length > 1;

  const goTo = useCallback(
    (i: number) => {
      if (i < 0) setCurrent(images.length - 1);
      else if (i >= images.length) setCurrent(0);
      else setCurrent(i);
    },
    [images.length],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      setZoomPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        ref={mainRef}
        className="relative aspect-square w-full cursor-crosshair overflow-hidden rounded-xl border border-[#f0f0f0] bg-white"
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const diff = touchX - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) diff > 0 ? goTo(current + 1) : goTo(current - 1);
          setTouchX(null);
        }}
      >
        {hasImages ? (
          <Image
            key={current}
            src={images[current]}
            alt={`${name} — фото ${current + 1}`}
            fill
            sizes="(max-width:768px) 100vw, 40vw"
            className="object-contain p-6 transition-transform duration-300"
            style={
              zoomed
                ? { transform: "scale(1.8)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                : undefined
            }
            priority={current === 0}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#ddd]">
            <Package size={64} strokeWidth={1} />
          </div>
        )}

        {/* Arrows */}
        {hasMultiple && (
          <>
            <button
              onClick={() => goTo(current - 1)}
              className="absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#eee] bg-white text-[#999] shadow-sm hover:text-[#222] md:flex"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goTo(current + 1)}
              className="absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#eee] bg-white text-[#999] shadow-sm hover:text-[#222] md:flex"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Mobile dots */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 md:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-5 bg-[#222]" : "w-1.5 bg-[#222]/20"
                }`}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        {hasMultiple && (
          <span className="absolute bottom-3 right-3 z-10 hidden rounded-md bg-[#f5f5f7] px-2 py-1 text-[12px] text-[#999] md:block">
            {current + 1}/{images.length}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 8).map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === current
                  ? "border-[#222]"
                  : "border-transparent hover:border-[#ddd]"
              }`}
            >
              <Image
                src={img}
                alt={`${name} — ${i + 1}`}
                fill
                sizes="64px"
                className="object-contain bg-white p-1"
                unoptimized
              />
            </button>
          ))}
          {images.length > 8 && (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-[#eee] text-[12px] text-[#999]">
              +{images.length - 8}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
