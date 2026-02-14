'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ImageIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { StatusFilter, ProductItem } from './EnrichmentPage';

interface Props {
  brandFilter: string;
  categoryFilter: string;
  statusFilter: StatusFilter;
  searchQuery: string;
  selectedProductId: string | null;
  onSelectProduct: (id: string) => void;
  onPhotoUploaded: () => void;
}

export function ProductList({
  brandFilter, categoryFilter, statusFilter, searchQuery,
  selectedProductId, onSelectProduct, onPhotoUploaded,
}: Props) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isDragFromBrowser, setIsDragFromBrowser] = useState(false);
  const PAGE_SIZE = 50;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
        fields: 'id,name_uk,sku,slug,price,main_image_url,photo_sources,description_uk,enrichment_status,brand_id,category_id',
      });

      if (brandFilter) params.set('brand_id', brandFilter);
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (searchQuery) params.set('search', searchQuery);

      if (statusFilter === 'no_description') params.set('no_description', '1');
      else if (statusFilter === 'no_photo') params.set('no_photo', '1');
      else if (statusFilter !== 'all') params.set('enrichment_status', statusFilter);

      const res = await fetch(`/api/admin/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('[ProductList] Fetch products failed:', err);
    }
    finally { setLoading(false); }
  }, [page, brandFilter, categoryFilter, statusFilter, searchQuery]);

  useEffect(() => { setPage(0); }, [brandFilter, categoryFilter, statusFilter, searchQuery]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function extractImageUrl(dt: DataTransfer): string | null {
    const uri = dt.getData('text/uri-list');
    if (uri && uri.startsWith('http')) return uri.trim();

    const html = dt.getData('text/html');
    if (html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match?.[1]?.startsWith('http')) return match[1];
      const dataSrc = html.match(/<img[^>]+data-src=["']([^"']+)["']/i);
      if (dataSrc?.[1]?.startsWith('http')) return dataSrc[1];
    }

    const text = dt.getData('text/plain');
    if (text?.startsWith('http') && /\.(jpg|jpeg|png|webp)/i.test(text)) return text.trim();

    return null;
  }

  async function handleDrop(e: React.DragEvent, productId: string) {
    e.preventDefault();
    setDragOverId(null);

    // Type 1: Files from computer
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files)
        .filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));

      if (files.length === 0) return;
      if (files.some(f => f.size > 5 * 1024 * 1024)) return;

      const formData = new FormData();
      formData.set('product_id', productId);
      files.forEach(f => formData.append('photos', f));

      await fetch('/api/enrichment/upload-photo', { method: 'POST', body: formData });
      fetchProducts();
      onPhotoUploaded();
      return;
    }

    // Type 2: URL from browser
    const imageUrl = extractImageUrl(e.dataTransfer);
    if (imageUrl) {
      await fetch('/api/enrichment/upload-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, image_url: imageUrl }),
      });
      fetchProducts();
      onPhotoUploaded();
    }
  }

  function handleDragOver(e: React.DragEvent, productId: string) {
    e.preventDefault();
    const hasFiles = e.dataTransfer.types.includes('Files');
    const hasUrl = e.dataTransfer.types.includes('text/uri-list') || e.dataTransfer.types.includes('text/html');

    if (hasFiles || hasUrl) {
      setDragOverId(productId);
      setIsDragFromBrowser(!hasFiles && hasUrl);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {loading && products.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-[#a855f7] animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {products.map(p => {
              const photoCount = (p.photo_sources?.length || 0) + (p.main_image_url ? 1 : 0);
              const isOver = dragOverId === p.id;
              const isSelected = selectedProductId === p.id;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    isOver
                      ? 'bg-[#a855f7]/10 ring-1 ring-[#a855f7]/30'
                      : isSelected
                        ? 'bg-white/[0.04]'
                        : 'hover:bg-white/[0.02]'
                  }`}
                  onClick={() => onSelectProduct(p.id)}
                  onDrop={(e) => handleDrop(e, p.id)}
                  onDragOver={(e) => handleDragOver(e, p.id)}
                  onDragLeave={() => setDragOverId(null)}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                    {p.main_image_url ? (
                      <img src={p.main_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-white/15" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{p.name_uk}</p>
                    <p className="text-[10px] text-white/30">{p.sku || '—'}</p>
                  </div>

                  {/* Photo count */}
                  <span className={`text-[10px] shrink-0 ${photoCount > 0 ? 'text-white/40' : 'text-red-400'}`}>
                    {photoCount > 0 ? `${photoCount} 📸` : '❌'}
                  </span>

                  {/* Status */}
                  <div className="shrink-0">
                    {p.enrichment_status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />}
                    {p.enrichment_status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                    {p.enrichment_status === 'enriched' && <CheckCircle2 className="w-3.5 h-3.5 text-[#a855f7]" />}
                    {!p.description_uk && !p.enrichment_status && <span className="text-[10px] text-amber-400">⚠️</span>}
                  </div>

                  {/* Drag overlay text */}
                  {isOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#a855f7]/10 pointer-events-none">
                      <span className="text-xs text-[#a855f7] font-medium">
                        {isDragFromBrowser ? '🌐 Фото буде скачано з сайту' : '📁 Відпустіть щоб завантажити'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.04] text-[10px] text-white/30">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-0.5 rounded bg-white/5 disabled:opacity-30">←</button>
          <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} з {total}</span>
          <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-0.5 rounded bg-white/5 disabled:opacity-30">→</button>
        </div>
      )}
    </div>
  );
}
