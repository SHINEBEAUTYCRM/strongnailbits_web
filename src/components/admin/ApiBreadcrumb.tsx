"use client";

import Link from "next/link";
import {
  ChevronRight, Cable, Key, Webhook, Activity, RefreshCw, Plug, BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Key, Webhook, Activity, RefreshCw, Plug, BookOpen, Cable,
};

interface Props {
  current: string;
  icon?: LucideIcon | string;
}

export function ApiBreadcrumb({ current, icon }: Props) {
  const Icon = typeof icon === "string" ? ICON_MAP[icon] : icon;

  return (
    <nav className="flex items-center gap-1.5 mb-4 text-[11px]">
      <Link
        href="/admin/api"
        className="flex items-center gap-1 text-zinc-600 hover:text-purple-400 transition-colors"
      >
        <Cable className="h-3 w-3" />
        API & Інтеграції
      </Link>
      <ChevronRight className="h-3 w-3 text-zinc-700" />
      <span className="flex items-center gap-1 text-zinc-400">
        {Icon && <Icon className="h-3 w-3" />}
        {current}
      </span>
    </nav>
  );
}
