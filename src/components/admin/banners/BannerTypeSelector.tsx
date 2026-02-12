"use client";

import type { BannerType } from '@/types/banners';
import { BANNER_TYPE_OPTIONS, BANNER_SIZES } from '@/types/banners';

interface BannerTypeSelectorProps {
  value: BannerType;
  onChange: (type: BannerType) => void;
}

export function BannerTypeSelector({ value, onChange }: BannerTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {BANNER_TYPE_OPTIONS.map((opt) => {
        const size = BANNER_SIZES[opt.value];
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-center transition-all"
            style={{
              background: isActive ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${isActive ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.06)'}`,
              boxShadow: isActive ? '0 0 20px rgba(168, 85, 247, 0.1)' : 'none',
            }}
          >
            <span className="text-xl">{opt.icon}</span>
            <span className="text-xs font-medium" style={{ color: isActive ? '#e5e7eb' : '#9ca3af' }}>
              {opt.label}
            </span>
            <span
              className="text-[9px]"
              style={{
                color: '#6b7280',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {size.width}×{size.height}
            </span>
          </button>
        );
      })}
    </div>
  );
}
