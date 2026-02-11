'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Package, Search, CheckCircle2, Sparkles, ImageIcon,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { StatusBadge } from '@/components/admin/enrichment/StatusBadge';
import type { EnrichmentStatus } from '@/lib/enrichment/types';

interface ProductRow {
  id: string;
  name_uk: string;
  sku: string | null;
  slug: string;
  price: number;
  main_image_url: string | null;
  enrichment_status: EnrichmentStatus;
  brand_name?: string;
  photo_sources?: unknown[];
}

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'Всі', value: '' },
  { label: 'Очікують', value: 'pending' },
  { label: 'Оброблені', value: 'enriched' },
  { label: 'Підтверджені', value: 'approved' },
  { label: 'Помилки', value: 'error' },
];

const PAGE_SIZE = 50;

function EnrichmentProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('offset', String(page * PAGE_SIZE));
      params.set('limit', String(PAGE_SIZE));

      const res = await fetch(`/api/admin/products?${params.toString()}&enrichment=true`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data || []);
        setTotal(data.total || data.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map(p => p.id)));
    }
  }

  async function handleApprove() {
    if (selected.size === 0) return;

    setApproving(true);
    try {
      const res = await fetch('/api/enrichment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: Array.from(selected) }),
      });

      if (res.ok) {
        setSelected(new Set());
        fetchProducts();
      }
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setApproving(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Товари — Enrichment</h1>
          <p className="text-sm text-white/50 mt-1">{total} товарів</p>
        </div>
        <Link href="/admin/enrichment" className="text-sm text-white/50 hover:text-white transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Пошук за назвою або артикулом..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#a855f7]/50"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30'
                  : 'bg-white/[0.04] text-white/50 border border-transparent hover:bg-white/[0.06]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20">
          <span className="text-sm text-[#a855f7]">{selected.size} обрано</span>
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#22c55e]/20 hover:bg-[#22c55e]/30 text-[#22c55e] text-xs font-medium transition-colors"
          >
            <CheckCircle2 className="w-3 h-3" />
            Підтвердити
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-white/40 hover:text-white/60"
          >
            Скасувати
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === products.length && products.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#a855f7]"
                />
              </th>
              <th className="p-3 text-left text-xs text-white/40 font-medium">Товар</th>
              <th className="p-3 text-left text-xs text-white/40 font-medium">Артикул</th>
              <th className="p-3 text-left text-xs text-white/40 font-medium">Бренд</th>
              <th className="p-3 text-center text-xs text-white/40 font-medium">Фото</th>
              <th className="p-3 text-left text-xs text-white/40 font-medium">Статус</th>
              <th className="p-3 text-right text-xs text-white/40 font-medium">Ціна</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-white/30">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Товарів не знайдено</p>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#a855f7]"
                    />
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/enrichment/products/${product.id}`}
                      className="text-sm text-white hover:text-[#a855f7] transition-colors line-clamp-1"
                    >
                      {product.name_uk}
                    </Link>
                  </td>
                  <td className="p-3 text-xs text-white/50 font-mono">{product.sku || '—'}</td>
                  <td className="p-3 text-xs text-white/50">{product.brand_name || '—'}</td>
                  <td className="p-3 text-center">
                    {product.main_image_url ? (
                      <ImageIcon className="w-4 h-4 text-[#22c55e] mx-auto" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-white/15 mx-auto" />
                    )}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={product.enrichment_status || 'pending'} />
                  </td>
                  <td className="p-3 text-right text-sm text-white/70">
                    {product.price?.toFixed(2)} ₴
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] disabled:opacity-30 text-white/50 text-xs"
          >
            <ChevronLeft className="w-3 h-3" /> Назад
          </button>
          <span className="text-xs text-white/40">
            Сторінка {page + 1} з {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] disabled:opacity-30 text-white/50 text-xs"
          >
            Далі <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function EnrichmentProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--t3)]">Завантаження...</div>}>
      <EnrichmentProductsContent />
    </Suspense>
  );
}
