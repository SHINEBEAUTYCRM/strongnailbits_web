"use client";

import { useEffect, useState } from "react";

/** Active: Feb 11 00:00 → Feb 15 23:59 (local time) */
function isValentinePeriod(): boolean {
  const now = new Date();
  const m = now.getMonth(); // 0-based → Feb=1
  const d = now.getDate();
  return m === 1 && d >= 11 && d <= 15;
}

const HEART_COUNT = 35;

const PALETTES = [
  { from: "#ff1744", to: "#d50000", glow: "rgba(255,23,68,0.5)" },      // classic red
  { from: "#ff4081", to: "#f50057", glow: "rgba(255,64,129,0.5)" },      // hot pink
  { from: "#e91e63", to: "#c2185b", glow: "rgba(233,30,99,0.4)" },       // deep rose
  { from: "#f48fb1", to: "#f06292", glow: "rgba(244,143,177,0.5)" },     // soft pink
  { from: "#ff80ab", to: "#ff4081", glow: "rgba(255,128,171,0.5)" },     // bubblegum
  { from: "#ce93d8", to: "#ab47bc", glow: "rgba(206,147,216,0.4)" },     // lavender
  { from: "#ef9a9a", to: "#e57373", glow: "rgba(239,154,154,0.5)" },     // coral pink
  { from: "#ffffff", to: "#fce4ec", glow: "rgba(255,255,255,0.6)" },     // white pearl
];

interface Heart {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotate: number;
  palette: (typeof PALETTES)[number];
  blur: number;
  opacity: number;
  swayAmt: number;
}

function generateHearts(): Heart[] {
  return Array.from({ length: HEART_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2.5,
    size: 14 + Math.random() * 28,
    rotate: -40 + Math.random() * 80,
    palette: PALETTES[Math.floor(Math.random() * PALETTES.length)],
    blur: Math.random() > 0.7 ? 1 + Math.random() * 2 : 0,
    opacity: 0.6 + Math.random() * 0.4,
    swayAmt: 20 + Math.random() * 40,
  }));
}

function HeartSVG({ size, palette, blur }: { size: number; palette: Heart["palette"]; blur: number }) {
  const id = `hg${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{ filter: blur > 0 ? `blur(${blur}px)` : undefined }}
    >
      <defs>
        <radialGradient id={id} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </radialGradient>
        {/* Glossy highlight */}
        <radialGradient id={`${id}h`} cx="35%" cy="25%" r="40%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      {/* Shadow */}
      <path
        d="M16 28C16 28 3 20 3 11.5C3 7 6.5 3.5 10.5 3.5C13 3.5 15 5 16 7C17 5 19 3.5 21.5 3.5C25.5 3.5 29 7 29 11.5C29 20 16 28 16 28Z"
        fill="rgba(0,0,0,0.15)"
        transform="translate(0.5, 1)"
      />
      {/* Main heart */}
      <path
        d="M16 28C16 28 3 20 3 11.5C3 7 6.5 3.5 10.5 3.5C13 3.5 15 5 16 7C17 5 19 3.5 21.5 3.5C25.5 3.5 29 7 29 11.5C29 20 16 28 16 28Z"
        fill={`url(#${id})`}
      />
      {/* Gloss */}
      <path
        d="M10.5 5.5C8 5.5 5 8 5 11.5C5 13 5.5 14.5 6.5 16C8 13 10 9 13 6.5C12 5.8 11 5.5 10.5 5.5Z"
        fill={`url(#${id}h)`}
        opacity="0.8"
      />
    </svg>
  );
}

export function ValentineHearts() {
  const [show, setShow] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    if (!isValentinePeriod()) return;

    const key = "valentine-hearts-2026";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    setHearts(generateHearts());
    setShow(true);

    const timer = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden" aria-hidden="true">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="valentine-heart absolute"
          style={{
            left: `${h.x}%`,
            bottom: "-5%",
            opacity: h.opacity,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            ["--rotate" as string]: `${h.rotate}deg`,
            ["--sway" as string]: `${h.swayAmt}px`,
            filter: `drop-shadow(0 0 ${6 + h.size * 0.3}px ${h.palette.glow})`,
          }}
        >
          <HeartSVG size={h.size} palette={h.palette} blur={h.blur} />
        </div>
      ))}

      {/* Sparkle particles */}
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={`sp${i}`}
          className="valentine-sparkle absolute rounded-full"
          style={{
            left: `${10 + Math.random() * 80}%`,
            bottom: "-3%",
            width: 3 + Math.random() * 4,
            height: 3 + Math.random() * 4,
            background: Math.random() > 0.5 ? "#fff" : "#ff80ab",
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
            boxShadow: `0 0 ${4 + Math.random() * 6}px rgba(255,128,171,0.8)`,
          }}
        />
      ))}

      {/* Central message */}
      <div className="valentine-message absolute inset-0 flex items-center justify-center">
        <div className="relative rounded-3xl border border-white/20 bg-white/85 px-10 py-6 text-center shadow-[0_8px_40px_rgba(225,29,98,0.2)] backdrop-blur-xl">
          {/* Decorative mini hearts */}
          <div className="absolute -left-3 -top-3">
            <svg width="24" height="24" viewBox="0 0 32 32"><path d="M16 28C16 28 3 20 3 11.5C3 7 6.5 3.5 10.5 3.5C13 3.5 15 5 16 7C17 5 19 3.5 21.5 3.5C25.5 3.5 29 7 29 11.5C29 20 16 28 16 28Z" fill="#ff4081" /></svg>
          </div>
          <div className="absolute -bottom-2 -right-2">
            <svg width="18" height="18" viewBox="0 0 32 32"><path d="M16 28C16 28 3 20 3 11.5C3 7 6.5 3.5 10.5 3.5C13 3.5 15 5 16 7C17 5 19 3.5 21.5 3.5C25.5 3.5 29 7 29 11.5C29 20 16 28 16 28Z" fill="#f48fb1" /></svg>
          </div>
          <p className="font-unbounded text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#e91e63] to-[#ff1744]">
            Happy Valentine&apos;s Day!
          </p>
          <p className="mt-1 text-sm font-medium text-[#ad1457]">
            З Днем Святого Валентина!
          </p>
        </div>
      </div>
    </div>
  );
}
