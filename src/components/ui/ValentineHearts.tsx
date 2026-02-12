"use client";

import { useEffect, useState } from "react";

/** Active: Feb 13 00:00 → Feb 15 23:59 (local time) */
function isValentinePeriod(): boolean {
  const now = new Date();
  const m = now.getMonth(); // 0-based → Jan=0, Feb=1
  const d = now.getDate();
  return m === 1 && d >= 13 && d <= 15;
}

const HEARTS = ["❤️", "💖", "💕", "💗", "💓", "💘", "💝", "🩷", "♥️", "🤍"];
const HEART_COUNT = 40;

interface Heart {
  id: number;
  emoji: string;
  x: number;       // % from left
  delay: number;    // seconds
  duration: number; // seconds
  size: number;     // rem
  rotate: number;   // deg
}

function generateHearts(): Heart[] {
  return Array.from({ length: HEART_COUNT }, (_, i) => ({
    id: i,
    emoji: HEARTS[Math.floor(Math.random() * HEARTS.length)],
    x: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 1.8 + Math.random() * 2,
    size: 0.8 + Math.random() * 1.8,
    rotate: -30 + Math.random() * 60,
  }));
}

export function ValentineHearts() {
  const [show, setShow] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    if (!isValentinePeriod()) return;

    // Only once per session
    const key = "valentine-hearts-2026";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    setHearts(generateHearts());
    setShow(true);

    // Remove after animation completes
    const timer = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden"
      aria-hidden="true"
    >
      {hearts.map((h) => (
        <span
          key={h.id}
          className="valentine-heart absolute"
          style={{
            left: `${h.x}%`,
            bottom: "-10%",
            fontSize: `${h.size}rem`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            ["--rotate" as string]: `${h.rotate}deg`,
          }}
        >
          {h.emoji}
        </span>
      ))}

      {/* Central message — fades in then out */}
      <div className="valentine-message absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl bg-white/80 px-8 py-5 text-center shadow-2xl backdrop-blur-md">
          <p className="text-3xl">💖</p>
          <p className="mt-1 font-unbounded text-lg font-bold text-[#e11d62]">
            Happy Valentine&apos;s Day!
          </p>
          <p className="mt-0.5 text-sm text-[#9f1239]">
            З Днем Святого Валентина! 💕
          </p>
        </div>
      </div>
    </div>
  );
}
