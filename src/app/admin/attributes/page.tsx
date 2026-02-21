"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Search,
  Plus,
  Pencil,
  Trash2,
  Filter,
  Loader2,
  Zap,
} from "lucide-react";

/* ================================================================== */
/*  Types & constants                                                  */
/* ================================================================== */

interface Feature {
  id: string;
  cs_cart_id: number | null;
  name_uk: string | null;
  name_ru: string | null;
  slug: string | null;
  feature_type: string | null;
  is_filter: boolean;
  filter_position: number | null;
  status: string | null;
  variants_count: number;
  products_count: number;
}

interface FilterItem {
  id: string;
  name_uk: string | null;
  name_ru: string | null;
  handle: string | null;
  source_type: string;
  feature_id: string | null;
  feature_name: string | null;
  display_type: string;
  position: number;
  is_active: boolean;
  collapsed: boolean;
  categories_count: number;
}

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  S: { label: "Select", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  T: { label: "Text", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  N: { label: "Number", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  C: { label: "Boolean", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  E: { label: "Color", color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  M: { label: "Multi", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
};

const TYPE_OPTIONS = [
  { value: "", label: "Всі типи" },
  { value: "S", label: "Select" },
  { value: "T", label: "Text" },
  { value: "N", label: "Number" },
  { value: "C", label: "Boolean" },
  { value: "E", label: "Color" },
  { value: "M", label: "Multi" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Всі статуси" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

const DISPLAY_BADGE: Record<string, string> = {
  checkbox: "Checkbox",
  range: "Range",
  color: "Color",
  toggle: "Toggle",
  radio: "Radio",
};

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  feature: { label: "feature", color: "#a855f7" },
  price: { label: "price", color: "#f97316" },
  brand: { label: "brand", color: "#3b82f6" },
};

const PAGE_SIZE = 50;
type Tab = "features" | "filters";

/* ================================================================== */
/*  Main page component                                                */
/* ================================================================== */

export default function AttributesPage() {
  const [tab, setTab] = useState<Tab>("features");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-semibold flex items-center gap-3"
            style={{ color: "var(--a-text)" }}
          >
            <SlidersHorizontal className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
            Характеристики та фільтри
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-lg p-1 mb-6"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", display: "inline-flex" }}
      >
        <button
          onClick={() => setTab("features")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            background: tab === "features" ? "var(--a-accent-bg)" : "transparent",
            color: tab === "features" ? "var(--a-accent)" : "var(--a-text-4)",
          }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Характеристики
        </button>
        <button
          onClick={() => setTab("filters")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            background: tab === "filters" ? "var(--a-accent-bg)" : "transparent",
            color: tab === "filters" ? "var(--a-accent)" : "var(--a-text-4)",
          }}
        >
          <Filter className="w-4 h-4" />
          Фільтри
        </button>
      </div>

      {tab === "features" ? <FeaturesTab /> : <FiltersTab />}
    </div>
  );
}

/* ================================================================== */
/*  Features Tab                                                       */
/* ================================================================== */

function FeaturesTab() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/admin/features?${params}`);
      const data = await res.json();
      setFeatures(Array.isArray(data) ? data : []);
    } catch {
      setFeatures([]);
    }
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  const filtered = useMemo(() => {
    let list = features;
    if (statusFilter === "active") list = list.filter((f) => f.status === "active");
    if (statusFilter === "disabled") list = list.filter((f) => f.status !== "active");
    return list;
  }, [features, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Видалити характеристику "${name}"?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/features/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Помилка видалення");
      else setFeatures((prev) => prev.filter((f) => f.id !== id));
    } catch { alert("Помилка мережі"); }
    setDeleting(null);
  };

  return (
    <>
      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "var(--a-text-4)" }}>{filtered.length} характеристик</p>
        <Link
          href="/admin/attributes/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--a-accent-btn)" }}
        >
          <Plus className="w-4 h-4" />
          Нова характеристика
        </Link>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--a-text-5)" }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Пошук за назвою або handle..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
        >
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "var(--a-bg-card)" }} />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
          <SlidersHorizontal className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--a-text-5)" }} />
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>Характеристики не знайдені</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--a-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ background: "var(--a-bg-card)", borderBottom: "1px solid var(--a-border)" }}>
                  {["Назва", "Handle", "Тип", "Варіанти", "Фільтр", "Статус", "Дії"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((f) => {
                  const badge = TYPE_BADGE[f.feature_type || ""] || { label: f.feature_type || "?", color: "var(--a-text-4)", bg: "var(--a-bg-input)" };
                  return (
                    <tr key={f.id} className="transition-colors cursor-pointer" style={{ borderBottom: "1px solid var(--a-border)" }}
                      onClick={() => router.push(`/admin/attributes/${f.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-card)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td className="px-4 py-3" style={{ minWidth: 200 }}>
                        <p className="font-medium" style={{ color: "var(--a-text)" }}>{f.name_uk || "—"}</p>
                        {f.name_ru && <p className="text-[11px] mt-0.5" style={{ color: "var(--a-text-5)" }}>{f.name_ru}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs px-2 py-1 rounded" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)", fontFamily: "monospace" }}>{f.slug || "—"}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {["S", "M", "E"].includes(f.feature_type || "") ? (
                          <span className="text-xs font-mono" style={{ color: "var(--a-text)" }}>{f.variants_count}</span>
                        ) : <span className="text-xs" style={{ color: "var(--a-text-5)" }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold" style={{ color: f.is_filter ? "#22c55e" : "var(--a-text-5)" }}>{f.is_filter ? "✓" : "✗"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium" style={{
                          color: f.status === "active" ? "#22c55e" : "#f97316",
                          background: f.status === "active" ? "rgba(34,197,94,0.12)" : "rgba(249,115,22,0.12)",
                        }}>{f.status || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/attributes/${f.id}`} onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--a-text-3)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--a-accent)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-3)"; }}
                          ><Pencil className="w-4 h-4" /></Link>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id, f.name_uk || ""); }} disabled={deleting === f.id}
                            className="p-1.5 rounded-lg transition-colors disabled:opacity-50" style={{ color: "var(--a-text-3)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-3)"; }}
                          ><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className="w-8 h-8 rounded-lg text-xs font-medium transition-colors" style={{
              background: p === page ? "var(--a-accent-bg)" : "transparent",
              color: p === page ? "var(--a-accent)" : "var(--a-text-4)",
              border: p === page ? "1px solid var(--a-accent)" : "1px solid var(--a-border)",
            }}>{p}</button>
          ))}
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Filters Tab                                                        */
/* ================================================================== */

function FiltersTab() {
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [autoCreating, setAutoCreating] = useState(false);
  const [autoResult, setAutoResult] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/filters?${params}`);
      const data = await res.json();
      setFilters(data.filters || []);
    } catch {
      setFilters([]);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  const handleAutoCreate = async () => {
    setAutoCreating(true);
    setAutoResult(null);
    try {
      const res = await fetch("/api/admin/filters/auto-create", { method: "POST" });
      const data = await res.json();
      setAutoResult(`Створено ${data.filters_created} фільтрів, ${data.bindings_created} прив'язок`);
      fetchFilters();
    } catch {
      setAutoResult("Помилка");
    }
    setAutoCreating(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Видалити фільтр "${name}"?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/filters/${id}`, { method: "DELETE" });
      if (res.ok) setFilters((prev) => prev.filter((f) => f.id !== id));
      else alert("Помилка видалення");
    } catch { alert("Помилка мережі"); }
    setDeleting(null);
  };

  const toggleActive = async (id: string, current: boolean) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, is_active: !current } : f)));
    await fetch(`/api/admin/filters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
  };

  return (
    <>
      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "var(--a-text-4)" }}>{filters.length} фільтрів</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoCreate}
            disabled={autoCreating}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: "var(--a-accent)", background: "var(--a-accent-bg)" }}
          >
            {autoCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Авто-створити
          </button>
        </div>
      </div>

      {autoResult && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          {autoResult}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--a-text-5)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук фільтрів..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "var(--a-bg-card)" }} />
          ))}
        </div>
      ) : filters.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
          <Filter className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--a-text-5)" }} />
          <p className="text-sm mb-3" style={{ color: "var(--a-text-4)" }}>Фільтри не знайдені</p>
          <button
            onClick={handleAutoCreate}
            disabled={autoCreating}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--a-accent-btn)" }}
          >
            Авто-створити з характеристик
          </button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--a-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ background: "var(--a-bg-card)", borderBottom: "1px solid var(--a-border)" }}>
                  {["Назва", "Джерело", "Тип", "Категорії", "Активний", "Дії"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--a-text-5)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filters.map((f) => {
                  const source = SOURCE_BADGE[f.source_type] || { label: f.source_type, color: "var(--a-text-4)" };
                  return (
                    <tr key={f.id} style={{ borderBottom: "1px solid var(--a-border)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-card)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: "var(--a-text)" }}>{f.name_uk || "—"}</p>
                        <code className="text-[10px]" style={{ color: "var(--a-text-5)", fontFamily: "monospace" }}>{f.handle}</code>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold" style={{ color: source.color }}>{source.label}</span>
                        {f.feature_name && (
                          <span className="text-[10px] ml-1" style={{ color: "var(--a-text-5)" }}>: {f.feature_name}</span>
                        )}
                      </td>

                      {/* Display type */}
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)" }}>
                          {DISPLAY_BADGE[f.display_type] || f.display_type}
                        </span>
                      </td>

                      {/* Categories */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono" style={{ color: "var(--a-text)" }}>
                          {["price", "brand"].includes(f.source_type) ? "Усі" : f.categories_count}
                        </span>
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(f.id, f.is_active)}
                          className="relative w-9 h-5 rounded-full transition-colors duration-200"
                          style={{
                            background: f.is_active ? "#22c55e" : "var(--a-bg-input)",
                            border: f.is_active ? "none" : "1px solid var(--a-border)",
                          }}
                        >
                          <span
                            className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
                            style={{
                              background: "#fff",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                              transform: f.is_active ? "translateX(18px)" : "translateX(2px)",
                            }}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(f.id, f.name_uk || "")}
                          disabled={deleting === f.id || ["price", "brand"].includes(f.source_type)}
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                          style={{ color: "var(--a-text-3)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-3)"; }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
