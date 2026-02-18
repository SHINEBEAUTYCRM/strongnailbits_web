'use client';

import { useState, useEffect } from 'react';
import { Loader2, Sparkles, CheckCircle2, RefreshCw, Pencil } from 'lucide-react';
import { SourceSelector } from './SourceSelector';
import { EnrichmentResult } from './EnrichmentResult';
import { SourceBadge } from './SourceBadge';

interface Props {
  productId: string;
  onUpdate: () => void;
}

interface Product {
  id: string;
  name_uk: string;
  sku: string | null;
  slug: string | null;
  price: number;
  description_uk: string | null;
  main_image_url: string | null;
  photo_sources: { url: string; source: string; type?: string }[] | null;
  enrichment_status: string | null;
  ai_metadata: Record<string, unknown> | null;
  brand_id: string | null;
  category_id: string | null;
  properties: Record<string, unknown> | null;
}

interface GenerateResult {
  description_uk: string;
  specs: Record<string, { value: string; source: string }>;
  season_tags: string[];
  style_tags: string[];
  compatible_slugs: string[];
  photos: { url: string; source: string; from?: string }[];
  source_matches: { name: string; url?: string; found: boolean; confidence?: number; reason?: string }[];
  sources_used: string[];
  cost_usd: number;
}

export function ProductWorkspace({ productId, onUpdate }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [useVision, setUseVision] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
    setFeedback('');
    fetchProduct();
  }, [productId]);

  async function fetchProduct() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?fields=id,name_uk,sku,slug,price,description_uk,main_image_url,photo_sources,enrichment_status,ai_metadata,brand_id,category_id,properties&id=${productId}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.products?.[0];
        if (p) setProduct(p);
      }
    } catch (err) {
      console.error('[ProductWorkspace] Fetch product failed:', err);
    }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/enrichment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          sources: selectedSources,
          use_vision: useVision,
          feedback: feedback || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка генерації');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(editedDescription?: string) {
    if (!result) return;
    setApproving(true);
    try {
      await fetch('/api/enrichment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          description_uk: editedDescription || result.description_uk,
          specs: result.specs,
          tags: { season: result.season_tags, style: result.style_tags },
          compatible_products: result.compatible_slugs,
        }),
      });
      onUpdate();
      fetchProduct();
    } catch (err) {
      console.error('[ProductWorkspace] Approve failed:', err);
    }
    finally { setApproving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-[#a855f7] animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const photoCount = (product.photo_sources?.length || 0) + (product.main_image_url ? 1 : 0);

  return (
    <div className="p-5 space-y-5 max-w-2xl">
      {/* Block 1: Current state */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-white">{product.name_uk}</h2>
        <p className="text-xs text-white/40">
          Артикул: <span className="font-mono">{product.sku || '—'}</span>  ·  Ціна: {product.price} ₴
          {product.enrichment_status && (
            <> · Статус: <span className={product.enrichment_status === 'approved' ? 'text-[#22c55e]' : 'text-[#a855f7]'}>{product.enrichment_status}</span></>
          )}
        </p>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-2 rounded-lg bg-white/[0.03]">
            <p className="text-white/30">📸 Фото</p>
            <p className="text-white/60 mt-0.5">
              {photoCount > 0 ? `${photoCount} фото` : '— немає'}
              {product.main_image_url && <span className="text-white/20 ml-1">📦 CS-Cart</span>}
            </p>
            {product.main_image_url && (
              <img src={product.main_image_url} alt="" className="w-12 h-12 mt-1 rounded object-cover border border-white/10" />
            )}
          </div>

          <div className="p-2 rounded-lg bg-white/[0.03]">
            <p className="text-white/30">📝 Опис</p>
            <p className="text-white/40 mt-0.5 line-clamp-3 text-[10px]">
              {product.description_uk || '— відсутній'}
            </p>
          </div>

          <div className="p-2 rounded-lg bg-white/[0.03]">
            <p className="text-white/30">📋 Характеристики</p>
            <p className="text-white/40 mt-0.5 text-[10px]">
              {product.properties && Object.keys(product.properties).length > 0
                ? `${Object.keys(product.properties).length} полів`
                : '— відсутні'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Block 2: Sources */}
      <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <p className="text-xs font-semibold text-white/50">📡 Джерела</p>

        <SourceSelector
          brandId={product.brand_id}
          selectedSources={selectedSources}
          onSourcesChange={setSelectedSources}
        />

        <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
          <input
            type="checkbox"
            checked={useVision}
            onChange={e => setUseVision(e.target.checked)}
            className="rounded border-white/20 bg-white/5"
          />
          📸 Аналіз фото (Vision)
        </label>

        {/* Source match results */}
        {result?.source_matches && result.source_matches.length > 0 && (
          <div className="space-y-1 mt-2">
            {result.source_matches.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="text-white/40">{m.name}</span>
                {m.found ? (
                  <span className="text-[#22c55e]">✅ Знайдено ({Math.round((m.confidence || 0) * 100)}%)</span>
                ) : (
                  <span className="text-white/20">⚠️ Не знайдено</span>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Збираю та генерую...' : 'Зібрати та згенерувати'}
        </button>

        {error && (
          <div className="text-xs text-red-400 p-2 rounded-lg bg-red-500/10 border border-red-500/20">{error}</div>
        )}
      </div>

      {/* Block 3: Result */}
      {result && (
        <EnrichmentResult
          result={result}
          feedback={feedback}
          onFeedbackChange={setFeedback}
          onApprove={handleApprove}
          onRegenerate={handleGenerate}
          approving={approving}
        />
      )}
    </div>
  );
}
