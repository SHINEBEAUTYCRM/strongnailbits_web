'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Search } from 'lucide-react';
import { ProductList } from './ProductList';
import { ProductWorkspace } from './ProductWorkspace';

interface Stats {
  total: number;
  no_description: number;
  no_photo: number;
  enriched: number;
  approved: number;
  errors: number;
}

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name_uk: string;
}

export type StatusFilter = 'all' | 'no_description' | 'no_photo' | 'enriched' | 'approved';

export interface ProductItem {
  id: string;
  name_uk: string;
  sku: string | null;
  slug: string | null;
  price: number;
  main_image_url: string | null;
  photo_sources: { url: string; source: string }[] | null;
  description_uk: string | null;
  enrichment_status: string | null;
  brand_id: string | null;
  category_id: string | null;
}

export function EnrichmentPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/enrichment/stats');
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStats();
    // Load brands
    fetch('/api/admin/brands').then(r => r.ok ? r.json() : []).then(d => setBrands(Array.isArray(d) ? d : d.brands || [])).catch(() => {});
    // Load categories
    fetch('/api/admin/categories').then(r => r.ok ? r.json() : []).then(d => setCategories(Array.isArray(d) ? d : d.categories || [])).catch(() => {});
  }, [fetchStats]);

  const filters = [
    { key: 'all' as const, label: 'Всі', count: stats?.total },
    { key: 'no_description' as const, label: 'Без опису', count: stats?.no_description },
    { key: 'no_photo' as const, label: 'Без фото', count: stats?.no_photo },
    { key: 'enriched' as const, label: 'Готові', count: stats?.enriched },
    { key: 'approved' as const, label: 'Підтверджені', count: stats?.approved },
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">AI Наповнення</h1>
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Статистика
          </button>
        </div>

        {showStats && stats && (
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { n: stats.total, l: 'Всього' },
              { n: stats.no_description, l: 'Без опису' },
              { n: stats.no_photo, l: 'Без фото' },
              { n: stats.enriched, l: 'Оброблено' },
              { n: stats.approved, l: 'Підтв.' },
            ].map((s, i) => (
              <div key={i} className="p-2 rounded-lg bg-white/[0.03]">
                <p className="text-sm font-bold text-white">{s.n.toLocaleString()}</p>
                <p className="text-[9px] text-white/30">{s.l}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70"
          >
            <option value="">Всі бренди</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70"
          >
            <option value="">Всі категорії</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name_uk}</option>)}
          </select>

          <div className="flex gap-1">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  statusFilter === f.key
                    ? 'bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/30'
                    : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]'
                }`}
              >
                {f.label} {f.count !== undefined ? f.count.toLocaleString() : ''}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Пошук за назвою або артикулом..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#a855f7]/50"
            />
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Product list */}
        <div className="w-[420px] border-r border-white/[0.06] flex flex-col">
          <ProductList
            brandFilter={selectedBrand}
            categoryFilter={selectedCategory}
            statusFilter={statusFilter}
            searchQuery={search}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
            onPhotoUploaded={fetchStats}
          />
        </div>

        {/* Right: Workspace */}
        <div className="flex-1 overflow-y-auto">
          {selectedProductId ? (
            <ProductWorkspace
              productId={selectedProductId}
              onUpdate={fetchStats}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white/20 text-sm">
              Виберіть товар зі списку зліва
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
