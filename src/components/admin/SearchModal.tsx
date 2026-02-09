"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Package, ShoppingBag, Users, Loader2, FolderTree, Award } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchModalProps { open: boolean; onClose: () => void; }
interface SearchResult {
  products: { id: string; name_uk: string; slug: string; price: number; main_image_url: string | null; sku: string | null }[];
  categories: { id: string; name_uk: string; slug: string }[];
  brands: { id: string; name: string; slug: string }[];
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  useEffect(() => { if (open) { setQuery(""); setResults(null); setTimeout(() => inputRef.current?.focus(), 100); } }, [open]);
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [open, onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try { const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`); if (res.ok) setResults(await res.json()); } catch {}
    setLoading(false);
  }, []);

  const handleChange = (val: string) => { setQuery(val); clearTimeout(timerRef.current); timerRef.current = setTimeout(() => doSearch(val), 300); };
  const navigate = (path: string) => { router.push(path); onClose(); };
  if (!open) return null;

  const hasProducts = results?.products && results.products.length > 0;
  const hasCategories = results?.categories && results.categories.length > 0;
  const hasBrands = results?.brands && results.brands.length > 0;
  const hasResults = hasProducts || hasCategories || hasBrands;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose} />
      <div className="relative w-full max-w-[640px] mx-4 rounded-2xl shadow-2xl overflow-hidden" style={{ background: "#111116", border: "1px solid #1e1e2a" }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #1e1e2a" }}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#7c3aed" }} /> : <Search className="w-5 h-5" style={{ color: "#52525b" }} />}
          <input ref={inputRef} type="text" value={query} onChange={(e) => handleChange(e.target.value)} placeholder="Пошук товарів, категорій, брендів..." className="flex-1 bg-transparent text-sm outline-none" style={{ color: "#e4e4e7" }} />
          <button onClick={onClose} style={{ color: "#52525b" }}><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 max-h-[420px] overflow-y-auto">
          {!query ? (
            <div className="text-center text-sm py-8" style={{ color: "#52525b" }}>
              <p>Почніть вводити для пошуку</p>
              <p className="mt-2 text-xs"><kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "#1a1a24", color: "#52525b" }}>⌘K</kbd> щоб відкрити</p>
            </div>
          ) : loading && !results ? (
            <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#3f3f46" }} /></div>
          ) : results && !hasResults ? (
            <div className="text-center text-sm py-8" style={{ color: "#52525b" }}>Нічого не знайдено</div>
          ) : (
            <div className="space-y-5">
              {hasProducts && <div><p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "#3f3f46" }}>Товари</p>{results!.products.map((p) => (
                <button key={p.id} onClick={() => navigate(`/admin/products?search=${encodeURIComponent(p.name_uk)}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left" style={{ color: "#a1a1aa" }}>
                  {p.main_image_url ? <img src={p.main_image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" style={{ background: "#1a1a24" }} /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#141420" }}><Package className="w-3.5 h-3.5" style={{ color: "#3f3f46" }} /></div>}
                  <div className="min-w-0 flex-1"><p className="text-sm truncate">{p.name_uk}</p>{p.sku && <p className="text-[10px] font-mono" style={{ color: "#3f3f46" }}>{p.sku}</p>}</div>
                  <span className="text-xs font-mono shrink-0" style={{ color: "#71717a" }}>{Number(p.price).toLocaleString("uk-UA")} ₴</span>
                </button>
              ))}</div>}
              {hasCategories && <div><p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "#3f3f46" }}>Категорії</p>{results!.categories.map((c) => (
                <button key={c.id} onClick={() => navigate("/admin/categories")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm" style={{ color: "#a1a1aa" }}><FolderTree className="w-4 h-4 shrink-0" style={{ color: "#52525b" }} />{c.name_uk}</button>
              ))}</div>}
              {hasBrands && <div><p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "#3f3f46" }}>Бренди</p>{results!.brands.map((b) => (
                <button key={b.id} onClick={() => navigate("/admin/brands")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm" style={{ color: "#a1a1aa" }}><Award className="w-4 h-4 shrink-0" style={{ color: "#52525b" }} />{b.name}</button>
              ))}</div>}
              <div><p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "#3f3f46" }}>Швидкі переходи</p>
                <button onClick={() => navigate(`/admin/products?search=${encodeURIComponent(query)}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm" style={{ color: "#71717a" }}><Package className="w-4 h-4 shrink-0" />Шукати &quot;{query}&quot; в товарах</button>
                <button onClick={() => navigate(`/admin/orders?search=${encodeURIComponent(query)}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm" style={{ color: "#71717a" }}><ShoppingBag className="w-4 h-4 shrink-0" />Шукати &quot;{query}&quot; в замовленнях</button>
                <button onClick={() => navigate(`/admin/clients?search=${encodeURIComponent(query)}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm" style={{ color: "#71717a" }}><Users className="w-4 h-4 shrink-0" />Шукати &quot;{query}&quot; в клієнтах</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-3 text-[11px]" style={{ borderTop: "1px solid #1e1e2a", color: "#3f3f46" }}>
          <span>Глобальний пошук</span>
          <span><kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: "#1a1a24", color: "#52525b" }}>ESC</kbd> щоб закрити</span>
        </div>
      </div>
    </div>
  );
}
