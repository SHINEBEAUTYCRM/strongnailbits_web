'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Play, Loader2, CheckCircle2, AlertTriangle, ShieldAlert,
  Globe, Sparkles, ImageIcon, Eye, Brain, Database, X,
} from 'lucide-react';
import type { PipelineProgress } from '@/lib/enrichment/types';

interface BrandOption {
  brand_id: string;
  brand_name: string;
  total: number;
}

const PIPELINE_STEPS = [
  { name: 'Парсинг', icon: Globe, color: '#f59e0b' },
  { name: 'Фото', icon: ImageIcon, color: '#06b6d4' },
  { name: 'Vision', icon: Eye, color: '#ec4899' },
  { name: 'AI Enrichment', icon: Brain, color: '#a855f7' },
  { name: 'Embeddings', icon: Database, color: '#22c55e' },
];

export default function EnrichmentPipelinePage() {
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Config
  const [brandId, setBrandId] = useState('');
  const [scope, setScope] = useState<'missing' | 'outdated' | 'errors' | 'all'>('missing');
  const [steps, setSteps] = useState({
    parse: true,
    download_photos: true,
    ai_vision: true,
    ai_enrichment: true,
    embeddings: true,
  });

  // Pipeline state
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  async function fetchBrands() {
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

  async function handleStart() {
    setRunning(true);
    setFinished(false);
    setError(null);
    setProgress(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/enrichment/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId || undefined,
          scope,
          steps,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Pipeline start failed');
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              setFinished(true);
              setRunning(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
                setRunning(false);
                return;
              }
              setProgress(parsed);
            } catch {
              // skip invalid JSON
            }
          }
        }
      }

      setFinished(true);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Pipeline зупинено');
      } else {
        setError(err instanceof Error ? err.message : 'Pipeline failed');
      }
    } finally {
      setRunning(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  // Estimate
  const selectedBrand = brands.find(b => b.brand_id === brandId);
  const estimateProducts = selectedBrand?.total || brands.reduce((sum, b) => sum + b.total, 0);
  const enabledSteps = Object.values(steps).filter(Boolean).length;
  const estimateTime = Math.ceil((estimateProducts * enabledSteps * 1.5) / 60); // rough minutes
  const estimateCost = (estimateProducts * enabledSteps * 0.002).toFixed(2); // rough $

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Запуск Pipeline</h1>
          <p className="text-sm text-white/50 mt-1">Налаштуйте та запустіть AI збагачення</p>
        </div>
        <Link href="/admin/enrichment" className="text-sm text-white/50 hover:text-white transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Config */}
      {!running && !finished && (
        <>
          {/* Brand select */}
          <section className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Вибір бренда</h2>
            <p className="text-xs text-white/30">Оберіть конкретний бренд або «Всі бренди» для масової обробки</p>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#a855f7]/50"
            >
              <option value="">Всі бренди</option>
              {brands.map((b) => (
                <option key={b.brand_id} value={b.brand_id}>
                  {b.brand_name} ({b.total} товарів)
                </option>
              ))}
            </select>
          </section>

          {/* Scope */}
          <section className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Скоуп</h2>
            <p className="text-xs text-white/30">Які товари обробити: тільки нові, з помилками, або все заново</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'missing' as const, label: 'Нові', desc: 'Тільки pending' },
                { value: 'outdated' as const, label: 'Застарілі', desc: 'pending + enriched' },
                { value: 'errors' as const, label: 'Помилки', desc: 'Тільки з помилками' },
                { value: 'all' as const, label: 'Всі', desc: 'Повний перезапуск' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScope(s.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    scope === s.value
                      ? 'bg-[#a855f7]/10 border-[#a855f7]/30 text-[#a855f7]'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:border-white/10'
                  }`}
                >
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-60">{s.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Steps */}
          <section className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Кроки</h2>
            <p className="text-xs text-white/30">Оберіть які етапи виконати. Кожен крок можна запускати окремо</p>
            <div className="space-y-2">
              {[
                { key: 'parse' as const, label: 'Парсинг сайтів брендів', icon: Globe },
                { key: 'download_photos' as const, label: 'Завантаження фото → Storage', icon: ImageIcon },
                { key: 'ai_vision' as const, label: 'Claude Vision (колір, фініш)', icon: Eye },
                { key: 'ai_enrichment' as const, label: 'Claude AI (описи, теги)', icon: Brain },
                { key: 'embeddings' as const, label: 'Embeddings (AI-пошук)', icon: Database },
              ].map((s) => (
                <label key={s.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={steps[s.key]}
                    onChange={(e) => setSteps({ ...steps, [s.key]: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#a855f7] focus:ring-[#a855f7]/50"
                  />
                  <s.icon className="w-4 h-4 text-white/30" />
                  <span className="text-sm text-white/70">{s.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Estimate */}
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5">
            <h2 className="text-sm font-semibold text-white mb-3">Оцінка</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-white">{estimateProducts.toLocaleString()}</p>
                <p className="text-[10px] text-white/40">Товарів</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">~{estimateTime} хв</p>
                <p className="text-[10px] text-white/40">Орієнтовний час</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">~${estimateCost}</p>
                <p className="text-[10px] text-white/40">Вартість API</p>
              </div>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium transition-colors"
          >
            <Play className="w-5 h-5" />
            Запустити Pipeline
          </button>
        </>
      )}

      {/* ═══════ CONFIRMATION DIALOG ═══════ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Підтвердження запуску</h3>
                <p className="text-sm text-white/50 mt-1">
                  Pipeline перезапише AI-дані товарів. Переконайтесь, що налаштування вірні.
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white/[0.03] rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Бренд:</span>
                <span className="text-white">{selectedBrand?.brand_name || 'Всі бренди'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Скоуп:</span>
                <span className="text-white">
                  {{ missing: 'Нові (pending)', outdated: 'Застарілі', errors: 'З помилками', all: 'ВСІ товари' }[scope]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Кроки:</span>
                <span className="text-white">{enabledSteps} з 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Товарів:</span>
                <span className="text-white font-medium">{estimateProducts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Час / Вартість:</span>
                <span className="text-white">~{estimateTime} хв / ~${estimateCost}</span>
              </div>
            </div>

            {scope === 'all' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/80">
                  Скоуп «Всі» перезапише навіть вже оброблені товари. Ручні правки будуть збережені.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleStart(); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Підтвердити та запустити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Running / Progress */}
      {(running || finished) && progress && (
        <div className="space-y-4">
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                {finished ? 'Завершено' : 'Виконується...'}
              </h2>
              {running && (
                <button
                  onClick={handleStop}
                  className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors"
                >
                  Зупинити
                </button>
              )}
            </div>

            {/* Steps progress */}
            <div className="space-y-3">
              {PIPELINE_STEPS.map((s, i) => {
                const stepNum = i + 1;
                const isActive = progress.step === stepNum;
                const isDone = progress.step > stepNum || finished;
                const isPending = progress.step < stepNum;

                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isDone ? 'bg-[#22c55e]/15' : isActive ? `bg-opacity-15` : 'bg-white/[0.04]'
                      }`}
                      style={isActive ? { backgroundColor: `${s.color}15` } : undefined}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                      ) : isActive ? (
                        running ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: s.color }} /> : <s.icon className="w-4 h-4" style={{ color: s.color }} />
                      ) : (
                        <s.icon className="w-4 h-4 text-white/20" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${isDone ? 'text-[#22c55e]' : isActive ? 'text-white' : 'text-white/30'}`}>
                        {s.name}
                      </p>
                      {isActive && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.round((progress.processed / Math.max(progress.total, 1)) * 100)}%`,
                                backgroundColor: s.color,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-white/40">
                            {progress.processed}/{progress.total}
                          </span>
                          {progress.errors > 0 && (
                            <span className="text-[10px] text-red-400">
                              {progress.errors} err
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Finished actions */}
          {finished && (
            <div className="flex items-center gap-3">
              <Link
                href="/admin/enrichment/products?status=enriched"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Переглянути оброблені
              </Link>
              <button
                onClick={() => { setFinished(false); setProgress(null); }}
                className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
              >
                Новий запуск
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
