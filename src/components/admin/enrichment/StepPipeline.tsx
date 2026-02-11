'use client';

import { useState, useRef } from 'react';
import {
  Play, Loader2, CheckCircle2, AlertTriangle, Pause,
  Globe, ImageIcon, Eye, Brain, Database, ArrowLeft, ShieldAlert, X,
} from 'lucide-react';
import type { EnrichmentStats } from './EnrichmentWizard';
import type { PipelineProgress } from '@/lib/enrichment/types';

interface Props {
  stats: EnrichmentStats | null;
  scope: 'missing' | 'errors' | 'all';
  onBack: () => void;
  onComplete: () => void;
}

const PIPELINE_STEPS = [
  { name: 'Парсинг сайтів брендів', icon: Globe, color: '#f59e0b' },
  { name: 'Завантаження фото', icon: ImageIcon, color: '#06b6d4' },
  { name: 'AI Vision (колір, фініш)', icon: Eye, color: '#ec4899' },
  { name: 'AI описи та теги', icon: Brain, color: '#a855f7' },
  { name: 'Індексація для пошуку', icon: Database, color: '#22c55e' },
];

export function StepPipeline({ stats, scope, onBack, onComplete }: Props) {
  const [phase, setPhase] = useState<'config' | 'running' | 'done'>('config');
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastProduct, setLastProduct] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const totalProducts = stats?.total || 0;
  const enabledSteps = 5;
  const estimateTime = Math.ceil((totalProducts * enabledSteps * 1.5) / 60);
  const estimateCost = (totalProducts * enabledSteps * 0.002).toFixed(2);

  async function handleStart() {
    setShowConfirm(false);
    setPhase('running');
    setError(null);
    setProgress(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/enrichment/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          steps: { parse: true, download_photos: true, ai_vision: true, ai_enrichment: true, embeddings: true },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Pipeline failed');
      }

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
              setPhase('done');
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) { setError(parsed.error); setPhase('done'); return; }
              setProgress(parsed);
              if (parsed.last_product) setLastProduct(parsed.last_product);
            } catch { /* skip */ }
          }
        }
      }

      setPhase('done');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Pipeline зупинено');
      } else {
        setError(err instanceof Error ? err.message : 'Pipeline failed');
      }
      setPhase('done');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">
          {phase === 'config' ? 'Крок 3. Обробка' : phase === 'running' ? 'Крок 3. Обробка...' : 'Крок 3. Готово!'}
        </h2>
        <p className="text-sm text-white/50 mt-1">
          {phase === 'config' && 'Claude обробляє товари. Це може зайняти 20-40 хвилин.'}
          {phase === 'running' && 'Не закривайте сторінку.'}
          {phase === 'done' && !error && 'Обробку завершено.'}
        </p>
      </div>

      {/* ── Config phase ── */}
      {phase === 'config' && (
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
          <p className="text-sm font-medium text-white">📊 Буде оброблено:</p>

          {stats?.by_brand.slice(0, 8).map(b => (
            <div key={b.brand_id} className="flex items-center justify-between text-xs">
              <span className="text-white/70">{b.brand_name}</span>
              <div className="flex items-center gap-3">
                <span className="text-white/40">{b.total} товарів</span>
                <span className="text-white/20">{b.photo_source_url ? '(є джерело)' : '(тільки AI)'}</span>
              </div>
            </div>
          ))}
          {(stats?.by_brand.length || 0) > 8 && (
            <p className="text-xs text-white/20">... ще {(stats?.by_brand.length || 0) - 8} брендів</p>
          )}

          <div className="border-t border-white/[0.04] pt-3 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-white">{totalProducts.toLocaleString()}</p>
              <p className="text-[10px] text-white/40">Товарів</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">~{estimateTime} хв</p>
              <p className="text-[10px] text-white/40">Час</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">~${estimateCost}</p>
              <p className="text-[10px] text-white/40">Вартість API</p>
            </div>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium transition-colors"
          >
            <Play className="w-5 h-5" /> Запустити
          </button>
        </div>
      )}

      {/* ── Running phase ── */}
      {phase === 'running' && progress && (
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#a855f7] animate-spin" />
              <span className="text-sm text-white">
                Обробка... {progress.processed.toLocaleString()} / {progress.total.toLocaleString()} ({Math.round((progress.processed / Math.max(progress.total, 1)) * 100)}%)
              </span>
            </div>
            <button
              onClick={() => abortRef.current?.abort()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors"
            >
              <Pause className="w-3.5 h-3.5" /> Пауза
            </button>
          </div>

          {/* Main progress bar */}
          <div className="w-full h-2.5 rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#a855f7] transition-all duration-300"
              style={{ width: `${Math.round((progress.processed / Math.max(progress.total, 1)) * 100)}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {PIPELINE_STEPS.map((s, i) => {
              const stepNum = i + 1;
              const isActive = progress.step === stepNum;
              const isDone = progress.step > stepNum;
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                    isDone ? 'bg-[#22c55e]/15' : isActive ? 'bg-white/[0.06]' : 'bg-white/[0.02]'
                  }`}>
                    {isDone
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                      : isActive
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: s.color }} />
                        : <s.icon className="w-3.5 h-3.5 text-white/15" />
                    }
                  </div>
                  <span className={`text-xs ${isDone ? 'text-[#22c55e]' : isActive ? 'text-white' : 'text-white/25'}`}>
                    {s.name}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-white/30 ml-auto">
                      {progress.processed}/{progress.total}
                      {progress.errors > 0 && <span className="text-red-400 ml-1">{progress.errors} err</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {lastProduct && (
            <p className="text-[10px] text-white/20">📝 Останній: {lastProduct}</p>
          )}
        </div>
      )}

      {/* ── Done phase ── */}
      {phase === 'done' && (
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
          {error ? (
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              <p className="text-xl font-bold text-white">🎉 Готово!</p>
              {progress && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-white/[0.02]">
                    <p className="text-white font-medium">{progress.processed.toLocaleString()}</p>
                    <p className="text-[10px] text-white/40">товарів оброблено</p>
                  </div>
                  {progress.errors > 0 && (
                    <div className="p-3 rounded-lg bg-red-500/5">
                      <p className="text-red-400 font-medium">{progress.errors}</p>
                      <p className="text-[10px] text-white/40">помилок</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium transition-colors"
          >
            Переглянути результати →
          </button>
        </div>
      )}

      {/* Error display */}
      {error && phase !== 'done' && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
      )}

      {/* Back button (only in config) */}
      {phase === 'config' && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
      )}

      {/* Confirmation dialog */}
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
                  Pipeline обробить {totalProducts.toLocaleString()} товарів. Це займе ~{estimateTime} хв і коштуватиме ~${estimateCost}.
                </p>
              </div>
              <button onClick={() => setShowConfirm(false)} className="p-1 rounded-lg hover:bg-white/5 text-white/30 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={handleStart}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" /> Запустити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
