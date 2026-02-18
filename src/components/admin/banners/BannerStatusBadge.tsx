"use client";

import type { Banner } from '@/types/banners';
import { getBannerStatus, BANNER_STATUS_CONFIG } from '@/types/banners';

export function BannerStatusBadge({ banner }: { banner: Banner }) {
  const status = getBannerStatus(banner);
  const config = BANNER_STATUS_CONFIG[status];
  
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
      style={{
        background: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
        letterSpacing: '0.5px',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
    </span>
  );
}
