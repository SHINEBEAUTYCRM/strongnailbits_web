"use client";

import {
  Undo2, Scissors, Paintbrush, Eclipse, Sun, ZoomIn, TypeOutline, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { HistoryEntry } from '@/lib/photoroom/types';

interface ImageHistoryProps {
  history: HistoryEntry[];
  onUndo: () => void;
  onSelectEntry: (entry: HistoryEntry) => void;
}

const actionIcons: Record<string, { icon: LucideIcon; color: string }> = {
  'remove-bg': { icon: Scissors, color: '#f87171' },
  'ai-background': { icon: Paintbrush, color: '#a855f7' },
  'shadow': { icon: Eclipse, color: '#6b7280' },
  'relight': { icon: Sun, color: '#facc15' },
  'upscale': { icon: ZoomIn, color: '#06b6d4' },
  'text-remove': { icon: TypeOutline, color: '#f97316' },
};

export function ImageHistory({ history, onUndo, onSelectEntry }: ImageHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs" style={{ color: '#4b5563' }}>
          Ще немає дій
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[10px] font-semibold uppercase"
          style={{
            color: '#6b7280',
            letterSpacing: '1.5px',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          Історія
        </p>
        {history.length > 0 && (
          <button
            onClick={onUndo}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
            style={{ color: '#9ca3af', background: 'rgba(255,255,255,0.03)' }}
          >
            <Undo2 className="w-3 h-3" />
            Скасувати
          </button>
        )}
      </div>

      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {history.map((entry, idx) => {
          const iconData = actionIcons[entry.action] || { icon: Wrench, color: '#6b7280' };
          const Icon = iconData.icon;

          return (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all"
              style={{
                background: idx === 0
                  ? 'rgba(168, 85, 247, 0.08)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${idx === 0 ? 'rgba(168, 85, 247, 0.15)' : 'transparent'}`,
              }}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: iconData.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] truncate" style={{ color: '#e5e7eb' }}>
                  {entry.label}
                </p>
                <p
                  className="text-[9px]"
                  style={{
                    color: '#4b5563',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {formatTime(entry.timestamp)}
                </p>
              </div>
              {entry.imageUrl && (
                <img
                  src={entry.imageUrl}
                  alt=""
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                  style={{ background: '#111116' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
