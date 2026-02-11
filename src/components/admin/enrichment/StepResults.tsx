'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, CheckCircle2, AlertTriangle, RefreshCw,
  ChevronDown, ChevronRight, ArrowLeft, ExternalLink,
} from 'lucide-react';
import { SourceBadge } from './SourceBadge';

interface Props {
  onBack: () => void;
  onRefreshStats: () => void;
}

interface ProductRow {
  id: string;
  name_uk: string;
  sku: string | null;
  slug: string | null;
  brand_name: string | null;
  enrichment_status: string;
  ai_metadata: Record<string, unknown> | null;
  photo_sources: { url: string; source: string }[] | null;
  main_image_url: string | null;
  description_uk: string | null;
}

type Filter = 'all' | 'enriched' | 'error' | 'approved';

export function StepResults({ onBack, onRefreshStats }: Props) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [approving, setApproving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 50;

  useEffect(() => { fetchProducts(); }, [filter, page]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
        fields: 'id,name_uk,sku,brand_id,enrichment_status,ai_metadata,photo_sources,main_image_url,description_uk',
      });
      if (filter !== 'all') params.set('enrichment_status', filter);

      const res = await fetch(`/api/admin/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveSelected() {
    if (selected.size === 0) return;
    setApproving(true);
    try {
      await fetch('/api/enrichment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: Array.from(selected) }),
      });
      setSelected(new Set());
      fetchProducts();
      onRefreshStats();
    } catch { /* silent */ }
    finally { setApproving(false); }
  }

  async function handleApproveAll() {
    setApproving(true);
    try {
      const ids = products.filter(p => p.enrichment_status !== 'approved').map(p => p.id);
      if (ids.length === 0) return;
      await fetch('/api/enrichment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: ids }),
      });
      fetchProducts();
      onRefreshStats();
    } catch { /* silent */ }
    finally { setApproving(false); }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `Всі` },
    { key: 'enriched', label: `Оброблені` },
    { key: 'error', label: `⚠️ Помилки` },
    { key: 'approved', label: `✅ Підтверджені` },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Крок 4. Перегляд та підтвердження</h2>
        <p className="text-sm text-white/50 mt-1">Перевірте результати та підтвердіть</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/30'
                : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="grid grid-cols-[32px_1fr_80px_50px_50px_50px] gap-2 px-4 py-2 text-[10px] uppercase text-white/30 border-b border-white/[0.04]">
          <span></span>
          <span>Товар</span>
          <span>Бренд</span>
          <span className="text-center">Опис</span>
          <span className="text-center">Фото</span>
          <span className="text-center">Теги</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-[#a855f7] animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03] max-h-[500px] overflow-y-auto">
            {products.map(p => {
              const isExpanded = expandedId === p.id;
              const meta = p.ai_metadata || {};
              const hasDesc = !!(meta as Record<string, unknown>).description_uk || !!p.description_uk;
              const photoCount = (p.photo_sources?.length || 0) + (p.main_image_url ? 1 : 0);
              const tagCount = (
                ((meta as Record<string, unknown>).season_tags as unknown[] || []).length +
                ((meta as Record<string, unknown>).style_tags as unknown[] || []).length
              );

              return (
                <div key={p.id}>
                  <div
                    className="grid grid-cols-[32px_1fr_80px_50px_50px_50px] gap-2 px-4 py-2.5 items-center hover:bg-white/[0.01] cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded border-white/20 bg-white/5"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? <ChevronDown className="w-3 h-3 text-white/20 shrink-0" /> : <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />}
                      <span className="text-sm text-white truncate">{p.name_uk}</span>
                      {p.enrichment_status === 'error' && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                      {p.enrichment_status === 'approved' && <CheckCircle2 className="w-3 h-3 text-[#22c55e] shrink-0" />}
                    </div>
                    <span className="text-[11px] text-white/30 truncate">{p.brand_name || '—'}</span>
                    <span className="text-center text-xs">{hasDesc ? '✅' : '—'}</span>
                    <span className="text-center text-xs">{photoCount > 0 ? `${photoCount} 📸` : '—'}</span>
                    <span className="text-center text-xs">{tagCount > 0 ? `${tagCount} 🏷` : '—'}</span>
                  </div>

                  {/* Expanded card */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-white/[0.01]">
                      <ProductCard product={p} onApprove={() => { fetchProducts(); onRefreshStats(); }} />
                    </div>
                  )}
                </div>
              );
            })}

            {products.length === 0 && (
              <div className="text-center py-8 text-sm text-white/30">Немає товарів</div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 text-xs text-white/40">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded bg-white/5 disabled:opacity-30">← Попередня</button>
          <span>Стор. {page + 1} з {Math.ceil(total / PAGE_SIZE)}</span>
          <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded bg-white/5 disabled:opacity-30">Наступна →</button>
        </div>
      )}

      {/* Bulk actions */}
      <div className="flex items-center gap-3">
        {selected.size > 0 && (
          <button
            onClick={handleApproveSelected}
            disabled={approving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-medium transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Підтвердити вибрані ({selected.size})
          </button>
        )}
        <button
          onClick={handleApproveAll}
          disabled={approving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22c55e]/10 hover:bg-[#22c55e]/20 text-[#22c55e] text-sm font-medium border border-[#22c55e]/20 transition-colors"
        >
          {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Підтвердити все
        </button>
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>
    </div>
  );
}

// ────── Product Card (accordion) ──────

function ProductCard({ product, onApprove }: { product: ProductRow; onApprove: () => void }) {
  const [regenerating, setRegenerating] = useState(false);
  const meta = (product.ai_metadata || {}) as Record<string, unknown>;
  const descField = meta.description_uk as { value?: string; source?: string } | undefined;
  const photos = product.photo_sources || [];

  async function handleApprove() {
    await fetch('/api/enrichment/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: [product.id] }),
    });
    onApprove();
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await fetch('/api/enrichment/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, fields: ['description_uk', 'season_tags', 'style_tags', 'compatible_with'] }),
      });
      onApprove();
    } finally { setRegenerating(false); }
  }

  return (
    <div className="bg-white/[0.02] rounded-lg border border-white/[0.04] p-4 space-y-3">
      <p className="text-sm font-semibold text-white">{product.name_uk}</p>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.slice(0, 5).map((p, i) => (
            <div key={i} className="relative shrink-0">
              <img src={p.url} alt="" className="w-16 h-16 object-cover rounded border border-white/10" />
              <div className="absolute bottom-0 right-0">
                <SourceBadge source={p.source as 'ai' | 'parsed' | 'cs_cart' | 'manual' | 'vision'} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {descField?.value && (
        <div>
          <p className="text-[10px] text-white/30">📝 Опис <SourceBadge source={(descField.source || 'ai') as 'ai'} /></p>
          <p className="text-xs text-white/60 mt-0.5 line-clamp-3">{descField.value}</p>
        </div>
      )}

      {/* Tags */}
      {(() => {
        const seasonTags = (meta.season_tags as { value?: string[] })?.value || [];
        const styleTags = (meta.style_tags as { value?: string[] })?.value || [];
        const compat = (meta.compatible_with as { value?: string[] })?.value || [];
        if (seasonTags.length === 0 && styleTags.length === 0 && compat.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1.5">
            {seasonTags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">{t}</span>)}
            {styleTags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#a855f7]/10 text-[#a855f7]">{t}</span>)}
            {compat.length > 0 && <span className="text-[10px] text-white/20">🔗 {compat.join(', ')}</span>}
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleApprove} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22c55e]/10 text-[#22c55e] text-xs font-medium hover:bg-[#22c55e]/20 transition-colors">
          <CheckCircle2 className="w-3.5 h-3.5" /> Підтвердити
        </button>
        <button onClick={handleRegenerate} disabled={regenerating} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors">
          {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Перегенерувати
        </button>
        <a href={`/product/${product.slug || product.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> На сайті
        </a>
      </div>
    </div>
  );
}
