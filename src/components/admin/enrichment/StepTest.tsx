'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, ArrowRight, RefreshCw, ChevronDown } from 'lucide-react';
import type { BrandStat } from './EnrichmentWizard';

interface Props {
  brands: BrandStat[];
  onBack: () => void;
  onNext: () => void;
}

interface TestData {
  product_name: string;
  product_code: string;
  product_url: string;
  parsed: {
    title?: string;
    description?: string;
    photos?: string[];
    photo_count?: number;
    specs?: Record<string, string>;
    specs_count?: number;
    composition?: string;
    instructions?: string;
  };
  // Original product data (from CS-Cart)
  original?: {
    name_uk: string;
    description_uk?: string | null;
    main_image_url?: string | null;
    price?: number;
    sku?: string;
  };
}

export function StepTest({ brands, onBack, onNext }: Props) {
  const [testData, setTestData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  const configuredBrands = brands.filter(b => b.photo_source_url || b.parse_config);

  useEffect(() => {
    if (configuredBrands.length > 0 && !testData && !loading) {
      runTest(configuredBrands[0].brand_id);
    }
  }, []);

  async function runTest(brandId?: string) {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (brandId) body.brand_id = brandId;
      else if (selectedBrand) body.brand_id = selectedBrand;
      else if (configuredBrands.length > 0) body.brand_id = configuredBrands[0].brand_id;

      if (!body.brand_id) {
        setError('Немає налаштованих брендів');
        return;
      }

      const res = await fetch('/api/enrichment/parse-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTestData(data);
      setSelectedBrand(body.brand_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка тесту');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Крок 2. Перевірте результат</h2>
        <p className="text-sm text-white/50 mt-1">
          Подивіться як AI обробить товар перш ніж запускати на всі {brands.reduce((s, b) => s + b.total, 0).toLocaleString()}
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#a855f7] animate-spin" />
          <span className="ml-3 text-sm text-white/50">Парсинг та AI обробка тестового товару...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
      )}

      {testData && !loading && (
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
          {/* Product header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40">📦 Тестовий товар</p>
              <p className="text-base font-semibold text-white mt-0.5">{testData.product_name}</p>
              <p className="text-xs text-white/30 mt-0.5">
                Артикул: <span className="font-mono">{testData.product_code}</span>
                {testData.product_url && (
                  <> · <a href={testData.product_url} target="_blank" rel="noopener noreferrer" className="text-[#a855f7] hover:underline">Сторінка ↗</a></>
                )}
              </p>
            </div>
          </div>

          {/* Side-by-side: Before / After */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BEFORE (CS-Cart) */}
            <div className="bg-white/[0.02] rounded-lg border border-white/[0.04] p-4 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase">ДО (CS-Cart)</p>

              <div>
                <p className="text-[10px] text-white/30">Назва:</p>
                <p className="text-sm text-white/60">{testData.original?.name_uk || testData.product_name}</p>
              </div>

              <div>
                <p className="text-[10px] text-white/30">Опис:</p>
                <p className="text-sm text-white/40 italic">
                  {testData.original?.description_uk || '— відсутній'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-white/30">Фото:</p>
                {testData.original?.main_image_url ? (
                  <img src={testData.original.main_image_url} alt="" className="w-16 h-16 object-cover rounded border border-white/10 mt-1" />
                ) : (
                  <p className="text-sm text-white/40 italic">— немає</p>
                )}
              </div>

              <div>
                <p className="text-[10px] text-white/30">Характеристики:</p>
                <p className="text-sm text-white/40 italic">— відсутні</p>
              </div>
            </div>

            {/* AFTER (AI enriched) */}
            <div className="bg-[#a855f7]/[0.03] rounded-lg border border-[#a855f7]/10 p-4 space-y-3">
              <p className="text-xs font-semibold text-[#a855f7]/60 uppercase">ПІСЛЯ (AI)</p>

              {testData.parsed.title && (
                <div>
                  <p className="text-[10px] text-white/30">Назва:</p>
                  <p className="text-sm text-white/80">{testData.parsed.title}</p>
                </div>
              )}

              {testData.parsed.description && (
                <div>
                  <p className="text-[10px] text-white/30">Опис:</p>
                  <p className="text-sm text-white/70 line-clamp-4">{testData.parsed.description}</p>
                </div>
              )}

              {testData.parsed.photos && testData.parsed.photos.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/30">Фото: {testData.parsed.photo_count}</p>
                  <div className="flex gap-1.5 mt-1 overflow-x-auto">
                    {testData.parsed.photos.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded border border-white/10" />
                    ))}
                  </div>
                </div>
              )}

              {testData.parsed.specs && testData.parsed.specs_count && testData.parsed.specs_count > 0 && (
                <div>
                  <p className="text-[10px] text-white/30">Характеристики:</p>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(testData.parsed.specs).slice(0, 6).map(([k, v]) => (
                      <div key={k} className="flex text-xs">
                        <span className="text-white/30 w-28 shrink-0">{k}</span>
                        <span className="text-white/60">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testData.parsed.composition && (
                <div>
                  <p className="text-[10px] text-white/30">Склад:</p>
                  <p className="text-xs text-white/50">{testData.parsed.composition}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => runTest()}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Інший товар
            </button>

            {configuredBrands.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs transition-colors"
                >
                  Тест іншого бренду <ChevronDown className="w-3 h-3" />
                </button>
                {showBrandDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl z-10 min-w-[180px]">
                    {configuredBrands.map(b => (
                      <button
                        key={b.brand_id}
                        onClick={() => { runTest(b.brand_id); setShowBrandDropdown(false); }}
                        className="block w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/5 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {b.brand_name} ({b.total})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
        >
          Запустити на всі товари <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
