"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Play, FlaskConical } from "lucide-react";
import { AiBulkProgress } from "@/components/admin/AiBulkProgress";

type BulkAction = "generate" | "translate" | "seo";
type TargetLang = "uk" | "ru";
type FilterType = "no_desc_uk" | "no_desc_ru" | "no_seo" | "brand" | "category";

interface FilterCounts {
  no_desc_uk: number;
  no_desc_ru: number;
  no_seo: number;
}

interface FilterOption {
  id: string;
  name: string;
}

interface ProductPreview {
  id: string;
  name_uk: string;
  name_ru: string;
  description_uk: string | null;
  description_ru: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

interface BulkResultItem {
  id: string;
  name: string;
  status: "success" | "skipped" | "error";
  html?: string;
  error?: string;
  tokens?: number;
}

export default function AiDescriptionsPage() {
  const [filter, setFilter] = useState<FilterType>("no_desc_uk");
  const [action, setAction] = useState<BulkAction>("generate");
  const [targetLang, setTargetLang] = useState<TargetLang>("uk");
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [counts, setCounts] = useState<FilterCounts>({ no_desc_uk: 0, no_desc_ru: 0, no_seo: 0 });
  const [productIds, setProductIds] = useState<string[]>([]);
  const [previews, setPreviews] = useState<ProductPreview[]>([]);
  const [results, setResults] = useState<BulkResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk run state
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [success, setSuccess] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [errors, setErrors] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filter, selectedBrand, selectedCategory]);

  const loadFilterData = async () => {
    try {
      const [brandsRes, catsRes, countsRes] = await Promise.all([
        fetch("/api/admin/brands").then(r => r.json()),
        fetch("/api/admin/categories").then(r => r.json()),
        fetch("/api/admin/ai/bulk-generate?action=counts").then(r => r.json()),
      ]);
      setBrands((brandsRes.brands || []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })));
      setCategories((catsRes.categories || []).map((c: { id: string; name_uk: string }) => ({ id: c.id, name: c.name_uk })));
      if (countsRes.counts) setCounts(countsRes.counts);
    } catch {
      // Counts API might not exist yet, use defaults
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      let url = `/api/admin/products?limit=1000&fields=id,name_uk,name_ru,description_uk,description_ru,meta_title,meta_description`;
      if (filter === "brand" && selectedBrand) url += `&brand_id=${selectedBrand}`;
      if (filter === "category" && selectedCategory) url += `&category_id=${selectedCategory}`;

      const res = await fetch(url);
      const data = await res.json();
      const allProducts: ProductPreview[] = data.products || [];

      let filtered: ProductPreview[];
      switch (filter) {
        case "no_desc_uk":
          filtered = allProducts.filter(p => !p.description_uk);
          break;
        case "no_desc_ru":
          filtered = allProducts.filter(p => !p.description_ru);
          break;
        case "no_seo":
          filtered = allProducts.filter(p => !p.meta_title || !p.meta_description);
          break;
        default:
          filtered = allProducts;
      }

      setProductIds(filtered.map(p => p.id));
      setPreviews(filtered.slice(0, 5));
    } catch {
      setProductIds([]);
      setPreviews([]);
    }
  };

  const estimatedCost = useCallback(() => {
    const count = productIds.length;
    if (action === "seo") return `$${(count * 0.002).toFixed(2)}`;
    return `$${(count * 0.013).toFixed(2)}`;
  }, [productIds.length, action]);

  const estimatedTime = useCallback(() => {
    const count = productIds.length;
    const secsPerItem = action === "seo" ? 1.5 : 3;
    const mins = Math.ceil((count * secsPerItem) / 60);
    return `~${mins} хв`;
  }, [productIds.length, action]);

  const runBulk = async (testMode = false) => {
    const ids = testMode ? productIds.slice(0, 5) : productIds;
    if (!ids.length) return;

    setRunning(true);
    setPaused(false);
    stoppedRef.current = false;
    pausedRef.current = false;
    setProcessed(0);
    setSuccess(0);
    setSkipped(0);
    setErrors(0);
    setTotalTokens(0);
    setResults([]);

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
          body: JSON.stringify({
            productIds: batch,
            action,
            targetLang,
            autoSave: !testMode,
          }),
        });
        const data = await res.json();

        if (data.results) {
          setResults(prev => [...prev, ...data.results]);
          const batchResults = data.results as BulkResultItem[];
          setProcessed(prev => prev + batchResults.length);
          setSuccess(prev => prev + batchResults.filter((r: BulkResultItem) => r.status === "success").length);
          setSkipped(prev => prev + batchResults.filter((r: BulkResultItem) => r.status === "skipped").length);
          setErrors(prev => prev + batchResults.filter((r: BulkResultItem) => r.status === "error").length);
          if (data.stats?.totalTokens) setTotalTokens(prev => prev + data.stats.totalTokens);
        }
      } catch {
        setErrors(prev => prev + batch.length);
        setProcessed(prev => prev + batch.length);
      }
    }

    setRunning(false);
  };

  const handlePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const handleStop = () => {
    stoppedRef.current = true;
    pausedRef.current = false;
    setPaused(false);
    setRunning(false);
  };

  const radioStyle = (active: boolean) => active
    ? { background: "#7c3aed20", color: "#a78bfa", border: "1px solid #7c3aed60" }
    : { background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm" style={{ color: "var(--a-text-4)" }}>Завантаження...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="p-2 rounded-lg" style={{ color: "var(--a-text-3)" }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "var(--a-text)" }}>
            <Sparkles className="w-5 h-5" style={{ color: "#a78bfa" }} /> AI генерація описів
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>
            Масове створення, переклад та SEO-оптимізація описів товарів
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Filters + Action */}
        <div className="space-y-6">
          {/* Filter */}
          <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--a-text-2)" }}>Фільтр товарів</h3>
            <div className="space-y-2">
              {([
                { k: "no_desc_uk", l: `Всі без описів UK (${counts.no_desc_uk || productIds.length})` },
                { k: "no_desc_ru", l: `Всі без описів RU (${counts.no_desc_ru || 0})` },
                { k: "no_seo", l: `Всі без SEO (${counts.no_seo || 0})` },
                { k: "brand", l: "Конкретний бренд" },
                { k: "category", l: "Конкретна категорія" },
              ] as const).map(f => (
                <label key={f.k} className="flex items-center gap-2 cursor-pointer">
                  <button
                    onClick={() => setFilter(f.k)}
                    className="px-3 py-2 rounded-lg text-xs font-medium w-full text-left"
                    style={radioStyle(filter === f.k)}
                  >
                    {f.l}
                  </button>
                </label>
              ))}
            </div>

            {filter === "brand" && (
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                className="w-full mt-3 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
              >
                <option value="">— Виберіть бренд —</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}

            {filter === "category" && (
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full mt-3 px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
              >
                <option value="">— Виберіть категорію —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          {/* Action */}
          <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--a-text-2)" }}>Дія</h3>
            <div className="space-y-2">
              {([
                { a: "generate" as BulkAction, lang: "uk" as TargetLang, l: "Згенерувати описи UK" },
                { a: "generate" as BulkAction, lang: "ru" as TargetLang, l: "Згенерувати описи RU" },
                { a: "translate" as BulkAction, lang: "ru" as TargetLang, l: "Переклад UK → RU" },
                { a: "translate" as BulkAction, lang: "uk" as TargetLang, l: "Переклад RU → UK" },
                { a: "seo" as BulkAction, lang: "uk" as TargetLang, l: "Згенерувати SEO meta" },
              ]).map((opt, i) => (
                <button
                  key={i}
                  onClick={() => { setAction(opt.a); setTargetLang(opt.lang); }}
                  className="px-3 py-2 rounded-lg text-xs font-medium w-full text-left"
                  style={radioStyle(action === opt.a && targetLang === opt.lang)}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Cost estimate + buttons */}
          <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg p-2.5" style={{ background: "var(--a-bg-input)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--a-text-5)" }}>Товарів</p>
                <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--a-text)" }}>{productIds.length}</p>
              </div>
              <div className="rounded-lg p-2.5" style={{ background: "var(--a-bg-input)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--a-text-5)" }}>Вартість</p>
                <p className="text-lg font-semibold tabular-nums" style={{ color: "#a78bfa" }}>~{estimatedCost()}</p>
              </div>
              <div className="rounded-lg p-2.5" style={{ background: "var(--a-bg-input)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--a-text-5)" }}>Час</p>
                <p className="text-lg font-semibold" style={{ color: "var(--a-text-2)" }}>{estimatedTime()}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => runBulk(true)}
                disabled={running || !productIds.length}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ background: "var(--a-bg-input)", color: "var(--a-text-2)", border: "1px solid var(--a-border)" }}
              >
                <FlaskConical className="w-4 h-4" /> Тест (5 товарів)
              </button>
              <button
                onClick={() => runBulk(false)}
                disabled={running || !productIds.length}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "#7c3aed" }}
              >
                <Play className="w-4 h-4" /> Запустити ({productIds.length})
              </button>
            </div>
          </div>
        </div>

        {/* Right: Preview + Progress */}
        <div className="space-y-6">
          {/* Progress (shown during/after run) */}
          {(running || processed > 0) && (
            <AiBulkProgress
              stats={{
                total: running ? (stoppedRef.current ? processed : productIds.length) : processed,
                processed,
                success,
                skipped,
                errors,
                totalTokens,
                running,
                paused,
              }}
              estimatedCost={estimatedCost()}
              onPause={handlePause}
              onStop={handleStop}
            />
          )}

          {/* Preview */}
          <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--a-text-2)" }}>
              Попередній перегляд (перші 5)
            </h3>
            {previews.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: "var(--a-text-5)" }}>Немає товарів для вибраного фільтру</p>
            ) : (
              <div className="space-y-2">
                {previews.map(p => {
                  const result = results.find(r => r.id === p.id);
                  const hasDesc = filter === "no_desc_uk" ? !!p.description_uk : filter === "no_desc_ru" ? !!p.description_ru : (!!p.meta_title && !!p.meta_description);
                  return (
                    <div key={p.id} className="rounded-lg p-3" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border-sub)" }}>
                      <p className="text-sm font-medium truncate" style={{ color: "var(--a-text-body)" }}>{p.name_uk || p.name_ru}</p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--a-text-5)" }}>
                        {hasDesc ? "Є опис — пропустити" : "Опису немає — згенерувати"}
                      </p>
                      {result && (
                        <p className="text-[11px] mt-1 font-medium" style={{ color: result.status === "success" ? "#4ade80" : result.status === "error" ? "#f87171" : "var(--a-text-4)" }}>
                          {result.status === "success" ? "✓ Згенеровано" : result.status === "error" ? `✗ ${result.error}` : "— Пропущено"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Results log */}
          {results.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--a-text-2)" }}>
                Результати ({results.length})
              </h3>
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] py-1" style={{ borderBottom: "1px solid var(--a-border-sub)" }}>
                    <span style={{ color: r.status === "success" ? "#4ade80" : r.status === "error" ? "#f87171" : "var(--a-text-5)" }}>
                      {r.status === "success" ? "✓" : r.status === "error" ? "✗" : "—"}
                    </span>
                    <span className="truncate flex-1" style={{ color: "var(--a-text-body)" }}>{r.name}</span>
                    {r.tokens && <span className="shrink-0" style={{ color: "var(--a-text-5)" }}>{r.tokens} tok</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
