"use client";

import { useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Banner } from "@/types/banners";

// ─── Analytics ────────────────────────────────────────────
function trackClick(bannerId: string) {
  fetch(`/api/banners/${bannerId}/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "click" }),
  }).catch(() => {});
}

function trackView(bannerId: string) {
  fetch(`/api/banners/${bannerId}/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "view" }),
  }).catch(() => {});
}

// ─── Props ────────────────────────────────────────────────
interface CategoryBannerProps {
  banners: Banner[];
  categoryId: string;
}

export function CategoryBanner({ banners, categoryId }: CategoryBannerProps) {
  const viewTrackedRef = useRef(false);

  // Find the highest-priority banner matching this category
  const banner = useMemo(() => {
    const matching = banners.filter((b) =>
      b.placement.some(
        (p) =>
          p === `category:${categoryId}` ||
          p === "catalog",
      ),
    );
    matching.sort((a, b) => b.priority - a.priority);
    return matching[0] ?? null;
  }, [banners, categoryId]);

  // Track view once
  useEffect(() => {
    if (banner && !viewTrackedRef.current) {
      viewTrackedRef.current = true;
      trackView(banner.id);
    }
  }, [banner]);

  if (!banner) return null;

  const overlayOpacity = banner.overlay_opacity ?? 0;
  const textColor = banner.text_color || "#ffffff";
  const bgColor = banner.bg_color || "#1a1a2e";
  const imageSrc = banner.image_desktop;

  const content = (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{ backgroundColor: bgColor }}
    >
      {/* Image */}
      {imageSrc && (
        <div className="relative aspect-[3/1] w-full sm:aspect-[4/1]">
          <Image
            src={imageSrc}
            alt={banner.image_alt || banner.title}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover"
          />

          {/* Mobile image */}
          {banner.image_mobile && (
            <Image
              src={banner.image_mobile}
              alt={banner.image_alt || banner.title}
              fill
              sizes="100vw"
              className="block object-cover sm:hidden"
            />
          )}
        </div>
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

      {/* Text overlay */}
      <div
        className="absolute inset-0 z-[2] flex flex-col justify-center px-6 sm:px-10"
        style={{ color: textColor }}
      >
        {banner.discount_text && (
          <span className="mb-1.5 inline-block w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm sm:text-xs">
            {banner.discount_text}
          </span>
        )}

        {banner.heading && (
          <h3 className="max-w-md text-lg font-bold leading-tight sm:text-2xl lg:text-3xl">
            {banner.heading}
          </h3>
        )}

        {banner.subheading && (
          <p className="mt-1 max-w-sm text-xs opacity-80 sm:text-sm">
            {banner.subheading}
          </p>
        )}

        {banner.button_text && (
          <span className="mt-3 inline-flex h-8 w-fit items-center rounded-full bg-white px-4 text-xs font-bold text-[#1a1a1a] transition-all hover:shadow-md sm:h-9 sm:text-sm">
            {banner.button_text}
          </span>
        )}
      </div>
    </div>
  );

  // Wrap in link if button_url exists
  if (banner.button_url) {
    return (
      <Link
        href={banner.button_url}
        onClick={() => trackClick(banner.id)}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}
