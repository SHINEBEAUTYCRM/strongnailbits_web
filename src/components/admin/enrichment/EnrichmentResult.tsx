'use client';

import { useState } from 'react';
import { CheckCircle2, RefreshCw, Pencil, Loader2 } from 'lucide-react';
import { SourceBadge } from './SourceBadge';

interface GenerateResult {
  description_uk: string;
  specs: Record<string, { value: string; source: string }>;
  season_tags: string[];
  style_tags: string[];
  compatible_slugs: string[];
  photos: { url: string; source: string; from?: string }[];
  sources_used: string[];
  cost_usd: number;
}

interface Props {
  result: GenerateResult;
  feedback: string;
  onFeedbackChange: (val: string) => void;
  onApprove: (editedDescription?: string) => void;
  onRegenerate: () => void;
  approving: boolean;
}

export function EnrichmentResult({ result, feedback, onFeedbackChange, onApprove, onRegenerate, approving }: Props) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState(result.description_uk);

  return (
    <div className="space-y-4 p-4 rounded-xl bg-[#a855f7]/[0.02] border border-[#a855f7]/10">
      <p className="text-xs font-semibold text-[#a855f7]/60">✨ Результат</p>

      {/* Photos */}
      {result.photos.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 mb-1">ФОТО ({result.photos.length})</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {result.photos.slice(0, 6).map((p, i) => (
              <div key={i} className="relative shrink-0">
                <img src={p.url} alt="" className="w-16 h-16 object-cover rounded border border-white/10" />
                <div className="absolute -bottom-1 -right-1">
                  <SourceBadge source={(p.source || 'parsed') as 'parsed'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <p className="text-[10px] text-white/30 mb-1">ОПИС (UA)</p>
        {editingDesc ? (
          <textarea
            value={editedDesc}
            onChange={e => setEditedDesc(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#a855f7]/50"
          />
        ) : (
          <p className="text-xs text-white/70 leading-relaxed">{result.description_uk}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => { setEditingDesc(!editingDesc); if (editingDesc) setEditedDesc(result.description_uk); }}
            className="text-[10px] text-white/30 hover:text-white/50"
          >
            <Pencil className="w-3 h-3 inline mr-0.5" />
            {editingDesc ? 'Скасувати' : 'Редагувати'}
          </button>
          {result.sources_used.length > 0 && (
            <span className="text-[10px] text-white/20">
              Джерела: {result.sources_used.map(s => `🌐 ${s}`).join(' · ')}
            </span>
          )}
        </div>
      </div>

      {/* Specs */}
      {Object.keys(result.specs).length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 mb-1">ХАРАКТЕРИСТИКИ</p>
          <div className="space-y-0.5">
            {Object.entries(result.specs).map(([key, val]) => (
              <div key={key} className="flex items-center text-xs gap-2">
                <span className="text-white/30 w-32 shrink-0 truncate">{key}</span>
                <span className="text-white/60">{val.value}</span>
                <span className="text-[9px] text-white/15 ml-auto">{val.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {(result.season_tags.length > 0 || result.style_tags.length > 0) && (
        <div>
          <p className="text-[10px] text-white/30 mb-1">ТЕГИ</p>
          <div className="flex flex-wrap gap-1">
            {result.season_tags.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">🏷 {t}</span>
            ))}
            {result.style_tags.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#a855f7]/10 text-[#a855f7]">🏷 {t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Compatible products */}
      {result.compatible_slugs.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 mb-1">СУМІСНІ ТОВАРИ</p>
          <div className="space-y-0.5">
            {result.compatible_slugs.map(s => (
              <a key={s} href={`/product/${s}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#a855f7] hover:underline">
                🔗 {s}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Cost */}
      <p className="text-[9px] text-white/15">Вартість: ${result.cost_usd}</p>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-white/[0.04]">
        <textarea
          value={feedback}
          onChange={e => onFeedbackChange(e.target.value)}
          placeholder="Замечания до AI (необовʼязково)..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/15 focus:outline-none focus:border-[#a855f7]/50"
        />

        <div className="flex gap-2">
          <button
            onClick={() => onApprove(editingDesc ? editedDesc : undefined)}
            disabled={approving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Підтвердити і зберегти
          </button>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Перегенерувати
          </button>
        </div>
      </div>
    </div>
  );
}
