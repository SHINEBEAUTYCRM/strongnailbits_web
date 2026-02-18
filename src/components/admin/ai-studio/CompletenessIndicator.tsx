"use client";

import { Camera, FileText, Globe, Search } from "lucide-react";

type Level = "none" | "short" | "few" | "partial" | "full";

interface CompletenessIndicatorProps {
  photo: Level;
  descUk: Level;
  descRu: Level;
  seo: Level;
  compact?: boolean;
}

const COLOR: Record<Level, string> = {
  none: "#ef4444",
  short: "#f59e0b",
  few: "#f59e0b",
  partial: "#f59e0b",
  full: "#4ade80",
};

const BG: Record<Level, string> = {
  none: "#ef444420",
  short: "#f59e0b20",
  few: "#f59e0b20",
  partial: "#f59e0b20",
  full: "#4ade8020",
};

const dots: { key: keyof Omit<CompletenessIndicatorProps, "compact">; icon: typeof Camera; tip: string }[] = [
  { key: "photo", icon: Camera, tip: "Фото" },
  { key: "descUk", icon: FileText, tip: "Опис UK" },
  { key: "descRu", icon: Globe, tip: "Опис RU" },
  { key: "seo", icon: Search, tip: "SEO" },
];

export function CompletenessIndicator({ photo, descUk, descRu, seo, compact }: CompletenessIndicatorProps) {
  const values = { photo, descUk, descRu, seo };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {dots.map(d => (
          <span
            key={d.key}
            className="w-2 h-2 rounded-full"
            style={{ background: COLOR[values[d.key]] }}
            title={`${d.tip}: ${values[d.key]}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {dots.map(d => {
        const Icon = d.icon;
        const level = values[d.key];
        return (
          <span
            key={d.key}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ color: COLOR[level], background: BG[level] }}
            title={`${d.tip}: ${level}`}
          >
            <Icon className="w-3 h-3" />
          </span>
        );
      })}
    </div>
  );
}
