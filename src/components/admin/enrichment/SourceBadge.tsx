'use client';

import type { EnrichmentSource } from '@/lib/enrichment/types';

const sourceConfig: Record<EnrichmentSource, { label: string; color: string; bg: string }> = {
  ai: { label: 'AI', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  vision: { label: 'Vision', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  parsed: { label: 'Сайт', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  cs_cart: { label: 'CS-Cart', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  manual: { label: 'Адмін', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
};

export function SourceBadge({ source }: { source: EnrichmentSource }) {
  const config = sourceConfig[source] || sourceConfig.cs_cart;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}30`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}
