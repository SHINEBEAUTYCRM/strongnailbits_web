'use client';

import type { EnrichmentStatus } from '@/lib/enrichment/types';

const statusConfig: Record<EnrichmentStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Очікує', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)' },
  parsing: { label: 'Парсинг', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  enriching: { label: 'AI обробка', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  enriched: { label: 'Оброблено', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  approved: { label: 'Підтверджено', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  error: { label: 'Помилка', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

export function StatusBadge({ status }: { status: EnrichmentStatus }) {
  const config = statusConfig[status] || statusConfig.pending;

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
