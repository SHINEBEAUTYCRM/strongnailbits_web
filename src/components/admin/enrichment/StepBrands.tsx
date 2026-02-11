'use client';

import { useState } from 'react';
import { Loader2, Check, Globe, ChevronDown, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import type { BrandStat } from './EnrichmentWizard';

interface Props {
  brands: BrandStat[];
  onNext: () => void;
  onRefreshStats: () => void;
}

export function StepBrands({ brands, onNext, onRefreshStats }: Props) {
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [sourceUrls, setSourceUrls] = useState<Record<string, string>>({});
  const [detecting, setDetecting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const configured = brands.filter(b => b.photo_source_url || b.parse_config);
  const notConfigured = brands.filter(b => !b.photo_source_url && !b.parse_config);

  // Sort: configured first, then by product count
  const sortedBrands = [
    ...configured.sort((a, b) => b.total - a.total),
    ...notConfigured.sort((a, b) => b.total - a.total),
  ];

  async function handleAutoDetect(brandId: string) {
    const url = sourceUrls[brandId];
    if (!url) return;

    setDetecting(brandId);
    setResults(prev => ({ ...prev, [brandId]: { success: false, message: '' } }));

    try {
      // 1. Auto-detect
      const res = await fetch('/api/enrichment/auto-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const selectorCount = Object.values(data.selectors || {}).filter(Boolean).length;

      // 2. Save to brand
      await fetch(`/api/admin/brands/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_source_url: url,
          info_source_url: url,
          parse_config: {
            selectors: data.selectors,
            auto_detected: true,
            detection_date: new Date().toISOString(),
          },
        }),
      });

      setResults(prev => ({
        ...prev,
        [brandId]: {
          success: true,
          message: `Знайдено: ${selectorCount} селекторів (точність ${Math.round((data.confidence || 0) * 100)}%)`,
        },
      }));
      setExpandedBrand(null);
      onRefreshStats();
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [brandId]: { success: false, message: err instanceof Error ? err.message : 'Помилка' },
      }));
    } finally {
      setDetecting(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Крок 1. Налаштуйте бренди</h2>
        <p className="text-sm text-white/50 mt-1">
          Вкажіть URL сайту для кожного бренду — Claude автоматично знайде як парсити товари
        </p>
      </div>

      {/* Brand table */}
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_1fr_100px] gap-2 px-4 py-2.5 text-[10px] uppercase text-white/30 border-b border-white/[0.04]">
          <span>Бренд</span>
          <span className="text-center">Товарів</span>
          <span>Джерело</span>
          <span className="text-center">Статус</span>
        </div>

        <div className="divide-y divide-white/[0.03] max-h-[480px] overflow-y-auto">
          {sortedBrands.map((brand) => {
            const isExpanded = expandedBrand === brand.brand_id;
            const isConfigured = !!(brand.photo_source_url || brand.parse_config);
            const result = results[brand.brand_id];
            const isDetecting = detecting === brand.brand_id;

            return (
              <div key={brand.brand_id}>
                {/* Row */}
                <div
                  className="grid grid-cols-[1fr_80px_1fr_100px] gap-2 px-4 py-2.5 items-center hover:bg-white/[0.01] cursor-pointer"
                  onClick={() => setExpandedBrand(isExpanded ? null : brand.brand_id)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    }
                    <span className="text-sm text-white truncate">{brand.brand_name}</span>
                  </div>
                  <span className="text-xs text-white/50 text-center">{brand.total}</span>
                  <span className="text-xs text-white/30 truncate">
                    {brand.photo_source_url || '—'}
                  </span>
                  <div className="flex justify-center">
                    {isConfigured || result?.success ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#22c55e]">
                        <Check className="w-3.5 h-3.5" /> Готово
                      </span>
                    ) : (
                      <span className="text-[11px] text-white/30">⚙️ Додати</span>
                    )}
                  </div>
                </div>

                {/* Inline form (accordion) */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-white/[0.01]">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] text-white/30 mb-1">URL каталогу</label>
                        <input
                          type="url"
                          value={sourceUrls[brand.brand_id] || brand.photo_source_url || ''}
                          onChange={(e) => setSourceUrls(prev => ({ ...prev, [brand.brand_id]: e.target.value }))}
                          placeholder="https://brand.ua/catalog/"
                          className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#a855f7]/50"
                        />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAutoDetect(brand.brand_id); }}
                        disabled={isDetecting || !(sourceUrls[brand.brand_id] || brand.photo_source_url)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 text-white text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isDetecting ? 'Аналізую...' : 'Знайти селектори'}
                      </button>
                    </div>

                    {/* Result */}
                    {result && (
                      <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
                        result.success
                          ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {result.success ? '✅' : '❌'} {result.message}
                      </div>
                    )}

                    {/* Info for unconfigured */}
                    {!isConfigured && !result && (
                      <p className="mt-2 text-[10px] text-white/20">
                        Без джерела — для товарів цього бренду AI створить опис тільки по назві та категорії
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/30">
          {configured.length + Object.values(results).filter(r => r.success).length} з {brands.length} брендів налаштовано
        </p>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
        >
          Далі <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
