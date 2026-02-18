"use client";

import { Sparkles, Globe, Search, Play } from "lucide-react";

interface MassActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkAction: (action: string) => void;
  running: boolean;
  useBrandSources: boolean;
  onToggleBrandSources: () => void;
}

export function MassActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkAction,
  running,
  useBrandSources,
  onToggleBrandSources,
}: MassActionBarProps) {
  const cost = (selectedCount * 0.015).toFixed(2);
  const mins = Math.ceil((selectedCount * 3) / 60);

  const btn = "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-30";

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={selectedCount > 0 ? onDeselectAll : onSelectAll}
            className="text-[11px] font-medium"
            style={{ color: "#a78bfa" }}
          >
            {selectedCount > 0 ? `Зняти вибір (${selectedCount})` : `Вибрати всі (${totalCount})`}
          </button>
          {selectedCount > 0 && (
            <span className="text-[11px]" style={{ color: "var(--a-text-4)" }}>
              Вибрано: {selectedCount}
            </span>
          )}
        </div>
        {selectedCount > 0 && (
          <span className="text-[11px]" style={{ color: "var(--a-text-5)" }}>
            ~${cost} · ~{mins} хв
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useBrandSources}
            onChange={onToggleBrandSources}
            className="w-3.5 h-3.5 rounded accent-purple-500"
          />
          <span className="text-[11px]" style={{ color: "var(--a-text-3)" }}>
            Використовувати джерела бренду (парсинг сайтів)
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => onBulkAction("generate_uk")} disabled={!selectedCount || running} className={btn} style={{ background: "#1a0f2e", color: "#a78bfa", border: "1px solid #7c3aed40" }}>
          <Sparkles className="w-3.5 h-3.5" /> Описи UK
        </button>
        <button onClick={() => onBulkAction("generate_ru")} disabled={!selectedCount || running} className={btn} style={{ background: "#1a0f2e", color: "#a78bfa", border: "1px solid #7c3aed40" }}>
          <Sparkles className="w-3.5 h-3.5" /> Описи RU
        </button>
        <button onClick={() => onBulkAction("translate_uk_ru")} disabled={!selectedCount || running} className={btn} style={{ background: "#0f1a2e", color: "#60a5fa", border: "1px solid #3b82f640" }}>
          <Globe className="w-3.5 h-3.5" /> UK → RU
        </button>
        <button onClick={() => onBulkAction("translate_ru_uk")} disabled={!selectedCount || running} className={btn} style={{ background: "#0f1a2e", color: "#60a5fa", border: "1px solid #3b82f640" }}>
          <Globe className="w-3.5 h-3.5" /> RU → UK
        </button>
        <button onClick={() => onBulkAction("seo")} disabled={!selectedCount || running} className={btn} style={{ background: "#0f1a1f", color: "#06b6d4", border: "1px solid #06b6d440" }}>
          <Search className="w-3.5 h-3.5" /> SEO meta
        </button>

        {selectedCount > 0 && (
          <button onClick={() => onBulkAction("start")} disabled={running} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white ml-auto" style={{ background: "#7c3aed" }}>
            <Play className="w-3.5 h-3.5" /> Запустити
          </button>
        )}
      </div>
    </div>
  );
}
