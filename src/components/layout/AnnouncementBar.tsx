"use client";

import React, { useRef, useCallback } from "react";
import { Truck, Sparkles, ShieldCheck } from "lucide-react";

interface Announcement {
  id: string;
  text_uk: string;
  text_ru: string | null;
  link_url: string | null;
  bg_color: string;
  text_color: string;
  icon: string | null;
}

interface Props {
  items: Announcement[];
  lang: "uk" | "ru";
}

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  truck: Truck,
  sparkles: Sparkles,
  "shield-check": ShieldCheck,
};

export function AnnouncementBar({ items, lang }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const offsetAtGrab = useRef(0);

  const getTranslateX = useCallback(() => {
    const el = trackRef.current;
    if (!el) return 0;
    const style = getComputedStyle(el);
    const matrix = new DOMMatrix(style.transform);
    return matrix.m41;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = trackRef.current;
      if (!el) return;
      dragging.current = true;
      startX.current = e.clientX;
      offsetAtGrab.current = getTranslateX();
      el.style.animationPlayState = "paused";
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
      el.setPointerCapture(e.pointerId);
    },
    [getTranslateX],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !trackRef.current) return;
    const delta = e.clientX - startX.current;
    trackRef.current.style.transform = `translateX(${offsetAtGrab.current + delta}px)`;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !trackRef.current) return;
    dragging.current = false;
    const el = trackRef.current;
    el.releasePointerCapture(e.pointerId);
    el.style.cursor = "";
    el.style.userSelect = "";
    el.style.transform = "";
    el.style.animationPlayState = "running";
  }, []);

  if (!items.length) return null;

  const Segment = ({ item }: { item: Announcement }) => {
    const Icon = item.icon ? ICONS[item.icon] : null;
    const label = lang === "ru" ? (item.text_ru || item.text_uk) : item.text_uk;
    return (
      <span className="inline-flex items-center gap-1.5">
        {Icon && <Icon size={14} className="shrink-0" />}
        <span>{label}</span>
      </span>
    );
  };

  const repeated = [...items, ...items, ...items];

  return (
    <div
      className="announcement-bar-holo overflow-hidden whitespace-nowrap py-2 text-[12px] font-semibold tracking-wide cursor-grab"
    >
      <div
        ref={trackRef}
        className="animate-marquee inline-flex items-center gap-0 relative z-[2]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {repeated.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="mx-4 opacity-40">•</span>}
            <Segment item={item} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
