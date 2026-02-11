'use client';

import {
  Play, RefreshCw, AlertTriangle, Settings, Eye,
} from 'lucide-react';
import type { EnrichmentStats } from './EnrichmentWizard';

interface Props {
  stats: EnrichmentStats;
  onAction: (action: 'new' | 'errors' | 'restart' | 'settings' | 'results') => void;
}

export function EnrichmentDashboard({ stats, onAction }: Props) {
  const enrichedPct = Math.round((stats.enriched / Math.max(stats.total, 1)) * 100);
  const approvedPct = Math.round((stats.approved / Math.max(stats.total, 1)) * 100);
  const pendingNew = stats.pending || stats.total - stats.enriched - stats.errors;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Enrichment</h1>
        <p className="text-sm text-white/50 mt-1">
          Автоматичне збагачення товарів через Claude
        </p>
      </div>

      {/* Main stats */}
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[#a855f7]">{stats.enriched.toLocaleString()}</p>
            <p className="text-[10px] text-white/40">оброблено</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
            <p className="text-[10px] text-white/40">помилки</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#22c55e]">{stats.approved.toLocaleString()}</p>
            <p className="text-[10px] text-white/40">підтверджено</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
            <span>Прогрес</span>
            <span>{enrichedPct}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#a855f7] to-[#22c55e] transition-all"
              style={{ width: `${enrichedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {pendingNew > 0 && (
          <button
            onClick={() => onAction('new')}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 hover:bg-[#a855f7]/15 transition-colors text-left"
          >
            <Play className="w-5 h-5 text-[#a855f7]" />
            <div>
              <p className="text-sm font-medium text-white">Обробити нові товари ({pendingNew})</p>
              <p className="text-[10px] text-white/30">Товари без AI-обробки</p>
            </div>
          </button>
        )}

        {stats.errors > 0 && (
          <button
            onClick={() => onAction('errors')}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors text-left"
          >
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-white">Повторити помилки ({stats.errors})</p>
              <p className="text-[10px] text-white/30">Перезапустити для товарів з помилками</p>
            </div>
          </button>
        )}

        <button
          onClick={() => onAction('results')}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors text-left"
        >
          <Eye className="w-5 h-5 text-white/40" />
          <div>
            <p className="text-sm font-medium text-white">Переглянути результати</p>
            <p className="text-[10px] text-white/30">{stats.approved} підтверджено з {stats.enriched}</p>
          </div>
        </button>

        <button
          onClick={() => onAction('restart')}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors text-left"
        >
          <RefreshCw className="w-5 h-5 text-white/40" />
          <div>
            <p className="text-sm font-medium text-white">Перезапустити все</p>
            <p className="text-[10px] text-white/30">Обробити всі {stats.total.toLocaleString()} товарів заново</p>
          </div>
        </button>

        <button
          onClick={() => onAction('settings')}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors text-left"
        >
          <Settings className="w-5 h-5 text-white/40" />
          <div>
            <p className="text-sm font-medium text-white">Налаштування брендів</p>
            <p className="text-[10px] text-white/30">Додати або змінити джерела парсингу</p>
          </div>
        </button>
      </div>
    </div>
  );
}
