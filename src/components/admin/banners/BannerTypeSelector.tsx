"use client";

import type { BannerType } from '@/types/banners';
import { BANNER_TYPE_OPTIONS, BANNER_SIZES, BANNER_TYPE_DESCRIPTIONS } from '@/types/banners';
import {
  Image, Megaphone, LayoutGrid, PanelRight, MessageSquare, Smartphone
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TYPE_ICONS: Record<string, LucideIcon> = {
  image: Image,
  megaphone: Megaphone,
  'layout-grid': LayoutGrid,
  'panel-right': PanelRight,
  'message-square': MessageSquare,
  smartphone: Smartphone,
};

interface BannerTypeSelectorProps {
  value: BannerType;
  onChange: (type: BannerType) => void;
}

export function BannerTypeSelector({ value, onChange }: BannerTypeSelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {BANNER_TYPE_OPTIONS.map((opt) => {
          const size = BANNER_SIZES[opt.value];
          const isActive = value === opt.value;
          const Icon = TYPE_ICONS[opt.icon] || Image;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-center transition-all"
              style={{
                background: isActive ? 'rgba(168, 85, 247, 0.1)' : 'var(--a-bg-hover)',
                border: `1px solid ${isActive ? 'rgba(168, 85, 247, 0.4)' : 'var(--a-border)'}`,
                boxShadow: isActive ? '0 0 20px rgba(168, 85, 247, 0.1)' : 'none',
              }}
            >
              <Icon size={20} style={{ color: isActive ? 'var(--a-accent-btn)' : 'var(--a-text-3)' }} />
              <span className="text-xs font-medium" style={{ color: isActive ? 'var(--a-text-body)' : 'var(--a-text-2)' }}>
                {opt.label}
              </span>
              <span
                className="text-[9px]"
                style={{
                  color: 'var(--a-text-3)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {size.width}×{size.height}
              </span>
            </button>
          );
        })}
      </div>
      {BANNER_TYPE_DESCRIPTIONS[value] && (
        <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--a-text-4)' }}>
          {BANNER_TYPE_DESCRIPTIONS[value]}
        </p>
      )}
    </div>
  );
}
