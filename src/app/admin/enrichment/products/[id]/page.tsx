'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, RefreshCw, Eye, Loader2,
  ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import { SourceBadge } from '@/components/admin/enrichment/SourceBadge';
import { StatusBadge } from '@/components/admin/enrichment/StatusBadge';
import type { EnrichmentSource, EnrichmentStatus, AIMetadata, PhotoSource } from '@/lib/enrichment/types';

interface ProductDetail {
  id: string;
  name_uk: string;
  name_ru: string | null;
  slug: string;
  sku: string | null;
  description_uk: string | null;
  price: number;
  main_image_url: string | null;
  images: string[];
  enrichment_status: EnrichmentStatus;
  enrichment_source: EnrichmentSource;
  enrichment_date: string | null;
  enriched_by: string | null;
  ai_metadata: AIMetadata;
  raw_parsed_data: Record<string, unknown>;
  photo_sources: PhotoSource[];
  brand_name?: string;
  category_name?: string;
}

const AI_FIELD_LABELS: Record<string, string> = {
  description_uk: 'Опис (UA)',
  color_family: 'Колір',
  color_hex: 'HEX',
  finish: 'Фініш',
  density: 'Щільність',
  volume_ml: "Об'єм (мл)",
  curing: 'Полімеризація',
  composition: 'Склад',
  season_tags: 'Сезон',
  style_tags: 'Стиль',
  compatible_with: 'Сумісність',
  skill_level: 'Рівень',
  application_tips: 'Нанесення',
};

export default function EnrichmentProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  async function fetchProduct() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}?enrichment=true`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!product) return;
    setApproving(true);
    try {
      const res = await fetch('/api/enrichment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: [product.id] }),
      });
      if (res.ok) fetchProduct();
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setApproving(false);
    }
  }

  async function handleRegenerate() {
    if (!product) return;
    setRegenerating(true);
    try {
      const fields = Object.keys(AI_FIELD_LABELS);
      const res = await fetch('/api/enrichment/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, fields }),
      });
      if (res.ok) fetchProduct();
    } catch (err) {
      console.error('Failed to regenerate:', err);
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-center text-white/40">Товар не знайдено</div>
    );
  }

  const metadata = (product.ai_metadata || {}) as Partial<AIMetadata>;
  const photos = product.photo_sources || [];
  const allPhotoUrls = photos.map(p => p.url).filter(Boolean);

  // Fallback to images array if no photo_sources
  const displayPhotos = allPhotoUrls.length > 0
    ? allPhotoUrls
    : (product.images || [product.main_image_url]).filter(Boolean);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40">
        <Link href="/admin/enrichment" className="hover:text-white/60">Enrichment</Link>
        <span>/</span>
        <Link href="/admin/enrichment/products" className="hover:text-white/60">Товари</Link>
        <span>/</span>
        <span className="text-white/60 truncate max-w-[200px]">{product.name_uk}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{product.name_uk}</h1>
          <div className="flex items-center gap-3 mt-2">
            {product.sku && <span className="text-xs text-white/40 font-mono">{product.sku}</span>}
            {product.brand_name && <span className="text-xs text-white/40">{product.brand_name}</span>}
            <StatusBadge status={product.enrichment_status || 'pending'} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
          >
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Перегенерувати
          </button>
          <button
            onClick={handleApprove}
            disabled={approving || product.enrichment_status === 'approved'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Підтвердити
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Photos */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Фото</h2>
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4">
            {displayPhotos.length > 0 ? (
              <>
                <div className="relative aspect-square rounded-lg overflow-hidden bg-white/[0.02] mb-3">
                  <img
                    src={displayPhotos[activePhoto] || ''}
                    alt={product.name_uk}
                    className="w-full h-full object-contain"
                  />
                  {photos[activePhoto] && (
                    <div className="absolute top-2 right-2">
                      <SourceBadge source={photos[activePhoto].source} />
                    </div>
                  )}
                  {displayPhotos.length > 1 && (
                    <>
                      <button
                        onClick={() => setActivePhoto(Math.max(0, activePhoto - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActivePhoto(Math.min(displayPhotos.length - 1, activePhoto + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                {displayPhotos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {displayPhotos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setActivePhoto(i)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                          i === activePhoto ? 'border-[#a855f7]' : 'border-transparent hover:border-white/20'
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square rounded-lg bg-white/[0.02] flex items-center justify-center text-white/20">
                Немає фото
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Опис</h2>
            {metadata.description_uk?.source && (
              <div className="flex items-center gap-2">
                <SourceBadge source={metadata.description_uk.source} />
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  {showOriginal ? 'AI' : 'Оригінал'}
                </button>
              </div>
            )}
          </div>
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4">
            {metadata.description_uk?.value ? (
              <div className="space-y-3">
                <p className="text-sm text-white/80 leading-relaxed">
                  {showOriginal
                    ? (metadata.description_uk.original_text || product.description_uk || 'Оригінал відсутній')
                    : metadata.description_uk.value}
                </p>
                {metadata.description_uk.original_source && (
                  <p className="text-[10px] text-white/30">
                    Джерело: {metadata.description_uk.original_source}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/40">
                {product.description_uk || 'Опис відсутній'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Metadata fields */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Характеристики</h2>
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
          <table className="w-full">
            <tbody className="divide-y divide-white/[0.04]">
              {Object.entries(AI_FIELD_LABELS).map(([key, label]) => {
                if (key === 'description_uk') return null; // Already shown above
                const field = metadata[key as keyof AIMetadata];
                if (!field || typeof field !== 'object' || !('value' in field)) return null;

                const value = field.value;
                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

                return (
                  <tr key={key} className="hover:bg-white/[0.01]">
                    <td className="px-4 py-2.5 text-xs text-white/40 w-36">{label}</td>
                    <td className="px-4 py-2.5 text-sm text-white/80">
                      {key === 'color_hex' && typeof value === 'string' ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded border border-white/10"
                            style={{ backgroundColor: value }}
                          />
                          <span className="font-mono text-xs">{value}</span>
                        </div>
                      ) : (
                        displayValue
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <SourceBadge source={field.source} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta info */}
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4 space-y-2">
        <h3 className="text-xs font-semibold text-white/40 uppercase">Мета</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-white/30">Статус:</span>{' '}
            <StatusBadge status={product.enrichment_status || 'pending'} />
          </div>
          <div>
            <span className="text-white/30">Джерело:</span>{' '}
            <span className="text-white/60">{product.enrichment_source || 'cs_cart'}</span>
          </div>
          {product.enrichment_date && (
            <div>
              <span className="text-white/30">Дата обробки:</span>{' '}
              <span className="text-white/60">{new Date(product.enrichment_date).toLocaleString('uk-UA')}</span>
            </div>
          )}
          {product.enriched_by && (
            <div>
              <span className="text-white/30">Оброблено:</span>{' '}
              <span className="text-white/60">{product.enriched_by}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleApprove}
          disabled={approving || product.enrichment_status === 'approved'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Підтвердити
        </button>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Перегенерувати
        </button>
        <a
          href={`/product/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          На сайті
        </a>
      </div>
    </div>
  );
}
