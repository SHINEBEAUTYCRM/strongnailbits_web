'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3, Package, ImageIcon, Sparkles, CheckCircle2,
  AlertTriangle, Play, ArrowRight, RefreshCw,
} from 'lucide-react';
import type { EnrichmentStats } from '@/lib/enrichment/types';

export default function EnrichmentDashboard() {
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/enrichment/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const enrichedPercent = stats ? Math.round((stats.enriched / Math.max(stats.total, 1)) * 100) : 0;
  const photoPercent = stats ? Math.round((stats.with_photo / Math.max(stats.total, 1)) * 100) : 0;
  const approvedPercent = stats ? Math.round((stats.approved / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Enrichment</h1>
          <p className="text-sm text-white/50 mt-1">Автоматичне збагачення товарів через AI</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Оновити
          </button>
          <Link
            href="/admin/enrichment/pipeline"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Запустити Pipeline
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Всього товарів"
              value={stats.total}
              icon={<Package className="w-5 h-5" />}
              color="#a855f7"
            />
            <StatCard
              label="З фото"
              value={stats.with_photo}
              icon={<ImageIcon className="w-5 h-5" />}
              color="#06b6d4"
              subtitle={`${photoPercent}%`}
            />
            <StatCard
              label="AI оброблено"
              value={stats.enriched}
              icon={<Sparkles className="w-5 h-5" />}
              color="#f59e0b"
              subtitle={`${enrichedPercent}%`}
            />
            <StatCard
              label="Підтверджено"
              value={stats.approved}
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="#22c55e"
              subtitle={`${approvedPercent}%`}
            />
          </div>

          {/* Progress bars */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ProgressBar label="Фото" percent={photoPercent} color="#06b6d4" />
            <ProgressBar label="AI Enrichment" percent={enrichedPercent} color="#a855f7" />
            <ProgressBar label="Підтверджено" percent={approvedPercent} color="#22c55e" />
          </div>

          {/* Error alert */}
          {stats.errors > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  {stats.errors} товарів з помилками
                </p>
                <p className="text-xs text-red-400/60 mt-0.5">
                  Перейдіть до товарів → фільтр &quot;Помилки&quot; для перегляду
                </p>
              </div>
              <Link
                href="/admin/enrichment/products?status=error"
                className="ml-auto px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors"
              >
                Переглянути
              </Link>
            </div>
          )}

          {/* Brands table */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white">Бренди</h2>
              <Link
                href="/admin/enrichment/brands"
                className="text-xs text-[#a855f7] hover:text-[#c084fc] transition-colors flex items-center gap-1"
              >
                Усі бренди <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {stats.by_brand.slice(0, 10).map((brand) => {
                const brandEnrichedPct = Math.round(
                  (brand.enriched / Math.max(brand.total, 1)) * 100,
                );
                return (
                  <div key={brand.brand_id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/enrichment/brands/${brand.brand_slug}`}
                        className="text-sm text-white hover:text-[#a855f7] transition-colors truncate block"
                      >
                        {brand.brand_name}
                      </Link>
                      <p className="text-xs text-white/40 mt-0.5">
                        {brand.total} товарів
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-1.5 rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${brandEnrichedPct}%`,
                            backgroundColor: '#a855f7',
                          }}
                        />
                      </div>
                      <span className="text-xs text-white/50 w-10 text-right">
                        {brandEnrichedPct}%
                      </span>
                      {brand.errors > 0 && (
                        <span className="text-xs text-red-400">{brand.errors} err</span>
                      )}
                      <Link
                        href={`/admin/enrichment/brands/${brand.brand_slug}`}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-[#a855f7] transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-white/40">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Не вдалося завантажити статистику</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-white/40">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
            {subtitle && (
              <span className="text-xs font-medium" style={{ color }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-medium" style={{ color }}>
          {percent}%
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
