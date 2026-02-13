"use client";

import { templateSizes } from '@/lib/photoroom/presets';
import type { TemplateSize } from '@/lib/photoroom/types';

interface TemplateSelectorProps {
  selected: TemplateSize;
  onChange: (template: TemplateSize) => void;
}

export function TemplateSelector({ selected, onChange }: TemplateSelectorProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {templateSizes.map((t) => {
        const isActive = t.id === selected.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
            style={{
              background: isActive
                ? 'rgba(168, 85, 247, 0.15)'
                : 'var(--a-bg-hover)',
              border: `1px solid ${isActive ? 'rgba(168, 85, 247, 0.3)' : 'var(--a-border)'}`,
              color: isActive ? 'var(--a-accent)' : 'var(--a-text-2)',
            }}
            title={`${t.width}×${t.height} — ${t.description}`}
          >
            {t.name}
            <span
              className="ml-1.5 opacity-50"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.5px' }}
            >
              {t.width}×{t.height}
            </span>
          </button>
        );
      })}
    </div>
  );
}
