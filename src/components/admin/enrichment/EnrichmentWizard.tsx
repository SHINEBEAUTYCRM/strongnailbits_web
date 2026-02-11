'use client';

import { useState, useEffect, useCallback } from 'react';
import { StepBrands } from './StepBrands';
import { StepTest } from './StepTest';
import { StepPipeline } from './StepPipeline';
import { StepResults } from './StepResults';
import { EnrichmentDashboard } from './EnrichmentDashboard';

export type WizardStep = 'brands' | 'test' | 'pipeline' | 'results';

export interface EnrichmentStats {
  total: number;
  with_photo: number;
  enriched: number;
  approved: number;
  errors: number;
  pending: number;
  by_brand: BrandStat[];
}

export interface BrandStat {
  brand_id: string;
  brand_name: string;
  brand_slug: string;
  total: number;
  enriched: number;
  approved: number;
  errors: number;
  photo_source_url?: string;
  parse_config?: Record<string, unknown>;
}

const STEPS: { key: WizardStep; label: string; num: number }[] = [
  { key: 'brands', label: 'Бренди', num: 1 },
  { key: 'test', label: 'Тест', num: 2 },
  { key: 'pipeline', label: 'Pipeline', num: 3 },
  { key: 'results', label: 'Результат', num: 4 },
];

export function EnrichmentWizard() {
  const [step, setStep] = useState<WizardStep>('brands');
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pipelineScope, setPipelineScope] = useState<'missing' | 'errors' | 'all'>('missing');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/enrichment/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const hasRunBefore = stats && stats.enriched > 0;

  // Dashboard after first run (only on initial load)
  if (hasRunBefore && step === 'brands') {
    return (
      <EnrichmentDashboard
        stats={stats}
        onAction={(action) => {
          if (action === 'new') { setPipelineScope('missing'); setStep('pipeline'); }
          if (action === 'errors') { setPipelineScope('errors'); setStep('pipeline'); }
          if (action === 'restart') { setPipelineScope('all'); setStep('brands'); }
          if (action === 'settings') setStep('brands');
          if (action === 'results') setStep('results');
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Wizard progress */}
      <WizardProgress currentStep={step} />

      {/* Mini stats */}
      {stats && <MiniStats stats={stats} />}

      {/* Steps */}
      {step === 'brands' && (
        <StepBrands
          brands={stats?.by_brand || []}
          onNext={() => setStep('test')}
          onRefreshStats={fetchStats}
        />
      )}
      {step === 'test' && (
        <StepTest
          brands={stats?.by_brand || []}
          onBack={() => setStep('brands')}
          onNext={() => setStep('pipeline')}
        />
      )}
      {step === 'pipeline' && (
        <StepPipeline
          stats={stats}
          scope={pipelineScope}
          onBack={() => setStep('test')}
          onComplete={() => { fetchStats(); setStep('results'); }}
        />
      )}
      {step === 'results' && (
        <StepResults
          onBack={() => setStep('pipeline')}
          onRefreshStats={fetchStats}
        />
      )}
    </div>
  );
}

// ────── Sub-components ──────

function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  const currentIdx = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center gap-2 px-1">
      {STEPS.map((s, i) => {
        const isActive = s.key === currentStep;
        const isDone = i < currentIdx;
        return (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isDone ? 'bg-[#22c55e] text-white'
                : isActive ? 'bg-[#a855f7] text-white'
                : 'bg-white/[0.06] text-white/30'
              }`}>
                {isDone ? '✓' : s.num}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                isActive ? 'text-white' : isDone ? 'text-[#22c55e]' : 'text-white/30'
              }`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${isDone ? 'bg-[#22c55e]' : 'bg-white/[0.08]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniStats({ stats }: { stats: EnrichmentStats }) {
  return (
    <div className="flex items-center gap-4 text-xs text-white/40 px-1">
      <span><strong className="text-white/70">{stats.total.toLocaleString()}</strong> товарів</span>
      <span>·</span>
      <span><strong className="text-white/70">{stats.with_photo.toLocaleString()}</strong> з фото</span>
      <span>·</span>
      <span><strong className="text-[#a855f7]">{stats.enriched.toLocaleString()}</strong> AI оброблено</span>
      <span>·</span>
      <span><strong className="text-[#22c55e]">{stats.approved.toLocaleString()}</strong> підтверджено</span>
    </div>
  );
}
