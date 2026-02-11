'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, Settings, CheckCircle2, AlertTriangle, ImageIcon } from 'lucide-react';

interface BrandItem {
  brand_id: string;
  brand_name: string;
  brand_slug: string;
  total: number;
  enriched: number;
  approved: number;
  errors: number;
  logo_url?: string;
  photo_source_url?: string;
  parse_config?: { auto_detected?: boolean };
}

export default function EnrichmentBrandsPage() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrands();
  }, []);

  async function fetchBrands() {
    setLoading(true);
    try {
      const res = await fetch('/api/enrichment/stats');
      if (res.ok) {
        const data = await res.json();
        setBrands(data.by_brand || []);
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Бренди — Enrichment</h1>
          <p className="text-sm text-white/50 mt-1">Налаштування парсерів та прогрес збагачення</p>
        </div>
        <Link
          href="/admin/enrichment"
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Немає брендів з товарами</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => {
            const enrichedPct = Math.round((brand.enriched / Math.max(brand.total, 1)) * 100);
            const approvedPct = Math.round((brand.approved / Math.max(brand.total, 1)) * 100);

            return (
              <Link
                key={brand.brand_id}
                href={`/admin/enrichment/brands/${brand.brand_slug}`}
                className="group bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 hover:border-[#a855f7]/30 transition-all"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/40 shrink-0">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt="" className="w-8 h-8 object-contain rounded" />
                    ) : (
                      <Award className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#a855f7] transition-colors truncate">
                      {brand.brand_name}
                    </h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      {brand.total} товарів
                    </p>
                  </div>
                  <Settings className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                </div>

                {/* Progress indicators */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3 h-3 text-[#06b6d4]" />
                    <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#06b6d4]"
                        style={{ width: `${enrichedPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/40 w-8 text-right">{enrichedPct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                    <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#22c55e]"
                        style={{ width: `${approvedPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/40 w-8 text-right">{approvedPct}%</span>
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2 mt-3">
                  {brand.errors > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      {brand.errors}
                    </span>
                  )}
                  {brand.parse_config?.auto_detected && (
                    <span className="text-[10px] text-[#a855f7] bg-[#a855f7]/10 px-1.5 py-0.5 rounded">
                      Auto-detect
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
