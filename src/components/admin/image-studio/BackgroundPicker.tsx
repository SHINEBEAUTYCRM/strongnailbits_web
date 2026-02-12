"use client";

import { backgroundPresets } from '@/lib/photoroom/presets';

interface BackgroundPickerProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
  onApply: (prompt: string) => void;
}

export function BackgroundPicker({ selected, onSelect, onApply }: BackgroundPickerProps) {
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase mb-2"
        style={{
          color: '#6b7280',
          letterSpacing: '1.5px',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        AI фони
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {backgroundPresets.map((preset) => {
          const isActive = selected === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => {
                if (isActive) {
                  onSelect(null);
                } else {
                  onSelect(preset.id);
                  onApply(preset.prompt);
                }
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all"
              style={{
                background: isActive
                  ? 'rgba(168, 85, 247, 0.1)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${isActive ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.04)'}`,
              }}
            >
              <span
                className="w-6 h-6 rounded-full flex-shrink-0"
                style={{
                  background: preset.color || '#333',
                  border: isActive
                    ? '2px solid rgba(168, 85, 247, 0.6)'
                    : '2px solid rgba(255,255,255,0.1)',
                  boxShadow: isActive
                    ? `0 0 8px ${preset.color || '#a855f7'}44`
                    : 'none',
                }}
              />
              <span
                className="text-[11px] truncate"
                style={{ color: isActive ? '#e5e7eb' : '#9ca3af' }}
              >
                {preset.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
