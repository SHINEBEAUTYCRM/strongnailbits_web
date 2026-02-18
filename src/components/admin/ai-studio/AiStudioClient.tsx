"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { ProductFilters } from "./ProductFilters";
import { ProductCard, type ProductStatusItem } from "./ProductCard";
import { ProductCardExpanded } from "./ProductCardExpanded";
import { MassActionBar } from "./MassActionBar";
import { BulkProgressPanel } from "./BulkProgressPanel";
import { BrandSourcesPanel } from "./BrandSourcesPanel";

interface FilterOption { id: string; name: string; }

interface BulkResult {
  id: string;
  name: string;
  status: "success" | "skipped" | "error";
  tokens?: number;
  error?: string;
  html?: string;
}

interface AiStudioClientProps {
  brands: FilterOption[];
  categories: FilterOption[];
}

export function AiStudioClient({ brands, categories }: AiStudioClientProps) {
  const [products, setProducts] = useState<ProductStatusItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("completeness_asc");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [brandSourceUrls, setBrandSourceUrls] = useState<string[]>([]);
  const [useBrandSources, setUseBrandSources] = useState(true);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkPaused, setBulkPaused] = useState(false);
  const [bulkProcessed, setBulkProcessed] = useState(0);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);

  const LIMIT = 25;

  const loadProducts = useCallback(async (p?: number, b?: string, c?: string, s?: string, so?: string) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p ?? page),
      limit: String(LIMIT),
      sort: so ?? sort,
    });
    const bv = b ?? brandId;
    const cv = c ?? categoryId;
    const sv = s ?? status;
    if (bv) params.set("brand_id", bv);
    if (cv) params.set("category_id", cv);
    if (sv) params.set("status", sv);

    try {
      const res = await fetch(`/api/admin/ai/products-status?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch {
      setProducts([]);
    }
    setLoading(false);
    setInitialLoad(false);
  }, [page, brandId, categoryId, status, sort]);

  // Initial load
  useState(() => { loadProducts(); });

  useEffect(() => {
    if (!brandId) { setBrandSourceUrls([]); return; }
    fetch(`/api/admin/brands?id=${brandId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setBrandSourceUrls(Array.isArray(d?.source_urls) ? d.source_urls.filter(Boolean) : []))
      .catch(() => setBrandSourceUrls([]));
  }, [brandId]);

  const changeBrand = (v: string) => { setBrandId(v); setPage(1); loadProducts(1, v, categoryId, status, sort); };
  const changeCategory = (v: string) => { setCategoryId(v); setPage(1); loadProducts(1, brandId, v, status, sort); };
  const changeStatus = (v: string) => { setStatus(v); setPage(1); loadProducts(1, brandId, categoryId, v, sort); };
  const changeSort = (v: string) => { setSort(v); loadProducts(page, brandId, categoryId, status, v); };
  const changePage = (v: number) => { setPage(v); loadProducts(v, brandId, categoryId, status, sort); };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(products.map(p => p.id)));
  const deselectAll = () => setSelected(new Set());
  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const handleCardAction = (id: string) => { setExpandedId(id); };

  const handleSave = (id: string, data: Partial<ProductStatusItem>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } as ProductStatusItem : p));
  };

  const handleBulkAction = (action: string) => {
    if (action === "start" && bulkAction) { runBulk(); return; }
    setBulkAction(action);
  };

  const runBulk = async () => {
    const ids = Array.from(selected);
    if (!ids.length || !bulkAction) return;

    let apiAction: string;
    let targetLang: string;
    switch (bulkAction) {
      case "generate_uk": apiAction = "generate"; targetLang = "uk"; break;
      case "generate_ru": apiAction = "generate"; targetLang = "ru"; break;
      case "translate_uk_ru": apiAction = "translate"; targetLang = "ru"; break;
      case "translate_ru_uk": apiAction = "translate"; targetLang = "uk"; break;
      case "seo": apiAction = "seo"; targetLang = "uk"; break;
      default: return;
    }

    setBulkRunning(true);
    setBulkPaused(false);
    stoppedRef.current = false;
    pausedRef.current = false;
    setBulkProcessed(0);
    setBulkResults([]);

    const BATCH = 10;
    for (let i = 0; i < ids.length; i += BATCH) {
      if (stoppedRef.current) break;
      while (pausedRef.current) {
        await new Promise(r => setTimeout(r, 500));
        if (stoppedRef.current) break;
      }
      if (stoppedRef.current) break;

      const batch = ids.slice(i, i + BATCH);
      try {
        const res = await fetch("/api/admin/ai/bulk-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: batch, action: apiAction, targetLang, autoSave: false, useBrandSources }),
        });
        const data = await res.json();
        if (data.results) {
          setBulkResults(prev => [...prev, ...data.results]);
          setBulkProcessed(prev => prev + data.results.length);
        }
      } catch {
        setBulkProcessed(prev => prev + batch.length);
      }
    }
    setBulkRunning(false);
  };

  const handleBulkPause = () => { pausedRef.current = !pausedRef.current; setBulkPaused(pausedRef.current); };
  const handleBulkStop = () => { stoppedRef.current = true; pausedRef.current = false; setBulkPaused(false); setBulkRunning(false); };

  const handleAcceptAll = async () => {
    const successResults = bulkResults.filter(r => r.status === "success" && r.html);
    for (const result of successResults) {
      try {
        const field = bulkAction.includes("ru") ? "description_ru" : bulkAction === "seo" ? "meta_title" : "description_uk";
        await fetch("/api/admin/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: result.id, [field]: result.html }),
        });
      } catch { /* continue */ }
    }
    setBulkResults([]);
    setBulkProcessed(0);
    setBulkAction("");
    loadProducts();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="p-2 rounded-lg" style={{ color: "var(--a-text-3)" }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "var(--a-text)" }}>
              <Sparkles className="w-5 h-5" style={{ color: "#a78bfa" }} /> AI Студія
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>
              {total} товарів · масове створення описів, SEO, фото
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <ProductFilters
          brands={brands}
          categories={categories}
          brandId={brandId}
          categoryId={categoryId}
          status={status}
          sort={sort}
          onBrandChange={changeBrand}
          onCategoryChange={changeCategory}
          onStatusChange={changeStatus}
          onSortChange={changeSort}
        />
      </div>

      {brandId && (
        <BrandSourcesPanel
          brandId={brandId}
          brandName={brands.find(b => b.id === brandId)?.name ?? brandId}
        />
      )}

      {(bulkRunning || bulkResults.length > 0) && (
        <div className="mb-4">
          <BulkProgressPanel
            total={bulkRunning ? selected.size : bulkProcessed}
            processed={bulkProcessed}
            results={bulkResults}
            running={bulkRunning}
            paused={bulkPaused}
            onPause={handleBulkPause}
            onStop={handleBulkStop}
            onAcceptAll={handleAcceptAll}
            onCancel={() => { setBulkResults([]); setBulkProcessed(0); setBulkAction(""); }}
          />
        </div>
      )}

      <div className="space-y-2 mb-4">
        {loading && initialLoad ? (
          <div className="py-12 text-center">
            <span className="text-sm" style={{ color: "var(--a-text-4)" }}>Завантаження...</span>
          </div>
        ) : products.length === 0 && !loading ? (
          <div className="py-12 text-center rounded-xl" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <span className="text-sm" style={{ color: "var(--a-text-5)" }}>Товарів не знайдено</span>
          </div>
        ) : (
          products.map(p =>
            expandedId === p.id ? (
              <ProductCardExpanded key={p.id} product={p} brandSourceUrls={brandSourceUrls} onSave={handleSave} onCollapse={() => setExpandedId(null)} />
            ) : (
              <ProductCard key={p.id} product={p} selected={selected.has(p.id)} expanded={false} onSelect={toggleSelect} onToggleExpand={toggleExpand} onAction={handleCardAction} />
            )
          )
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs" style={{ color: "var(--a-text-5)" }}>
            {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} з {total}
          </p>
          <div className="flex gap-1">
            {page > 1 && (
              <button onClick={() => changePage(page - 1)} className="px-2.5 py-1 rounded-lg text-xs" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)" }}>←</button>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (pg > totalPages) return null;
              return (
                <button key={pg} onClick={() => changePage(pg)} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={pg === page ? { color: "#a78bfa", background: "#7c3aed20" } : { color: "var(--a-text-3)", background: "var(--a-bg-input)" }}>
                  {pg}
                </button>
              );
            })}
            {page < totalPages && (
              <button onClick={() => changePage(page + 1)} className="px-2.5 py-1 rounded-lg text-xs" style={{ color: "var(--a-text-3)", background: "var(--a-bg-input)" }}>→</button>
            )}
          </div>
        </div>
      )}

      <MassActionBar
        selectedCount={selected.size}
        totalCount={products.length}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onBulkAction={handleBulkAction}
        running={bulkRunning}
        useBrandSources={useBrandSources}
        onToggleBrandSources={() => setUseBrandSources(v => !v)}
      />
    </div>
  );
}
