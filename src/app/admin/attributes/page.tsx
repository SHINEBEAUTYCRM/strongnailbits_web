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
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

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

const PAGE_SIZE = 50;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AttributesPage() {
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
      if (statusFilter === "active") params.set("is_filter", "true");
      const res = await fetch(`/api/admin/features?${params}`);
      const data = await res.json();
      setFeatures(Array.isArray(data) ? data : []);
    } catch {
      setFeatures([]);
    }
    setLoading(false);
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

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
      if (!res.ok) {
        alert(data.error || "Помилка видалення");
      } else {
        setFeatures((prev) => prev.filter((f) => f.id !== id));
      }
    } catch {
      alert("Помилка мережі");
    }
    setDeleting(null);
  };

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
            Характеристики
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--a-text-4)" }}>
            {filtered.length} характеристик
          </p>
        </div>
        <Link
          href="/admin/attributes/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--a-accent-btn)" }}
        >
          <Plus className="w-4 h-4" />
          Нова характеристика
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--a-text-5)" }}
          />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Пошук за назвою або handle..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{
              background: "var(--a-bg-card)",
              border: "1px solid var(--a-border)",
              color: "var(--a-text-body)",
            }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
            color: "var(--a-text-body)",
          }}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
            color: "var(--a-text-body)",
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg animate-pulse"
              style={{ background: "var(--a-bg-card)" }}
            />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <SlidersHorizontal className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--a-text-5)" }} />
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
            Характеристики не знайдені
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--a-border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ background: "var(--a-bg-card)", borderBottom: "1px solid var(--a-border)" }}>
                  {["Назва", "Handle", "Тип", "Варіанти", "Фільтр", "Статус", "Дії"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--a-text-5)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((f) => {
                  const badge = TYPE_BADGE[f.feature_type || ""] || {
                    label: f.feature_type || "?",
                    color: "var(--a-text-4)",
                    bg: "var(--a-bg-input)",
                  };

                  return (
                    <tr
                      key={f.id}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--a-border)" }}
                      onClick={() => router.push(`/admin/attributes/${f.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-card)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* Name */}
                      <td className="px-4 py-3" style={{ minWidth: 200 }}>
                        <p className="font-medium" style={{ color: "var(--a-text)" }}>
                          {f.name_uk || "—"}
                        </p>
                        {f.name_ru && (
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--a-text-5)" }}>
                            {f.name_ru}
                          </p>
                        )}
                      </td>

                      {/* Handle / slug */}
                      <td className="px-4 py-3">
                        <code
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            background: "var(--a-bg-input)",
                            color: "var(--a-text-3)",
                            fontFamily: "monospace",
                          }}
                        >
                          {f.slug || "—"}
                        </code>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold"
                          style={{ color: badge.color, background: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Variants preview */}
                      <td className="px-4 py-3">
                        {["S", "M", "E"].includes(f.feature_type || "") ? (
                          <span className="text-xs font-mono" style={{ color: "var(--a-text)" }}>
                            {f.variants_count}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--a-text-5)" }}>—</span>
                        )}
                      </td>

                      {/* Filter */}
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: f.is_filter ? "#22c55e" : "var(--a-text-5)" }}
                        >
                          {f.is_filter ? "✓" : "✗"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[11px] font-medium"
                          style={{
                            color: f.status === "active" ? "#22c55e" : "#f97316",
                            background: f.status === "active" ? "rgba(34,197,94,0.12)" : "rgba(249,115,22,0.12)",
                          }}
                        >
                          {f.status || "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/attributes/${f.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: "var(--a-text-3)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--a-accent)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-3)"; }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(f.id, f.name_uk || "");
                            }}
                            disabled={deleting === f.id}
                            className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                            style={{ color: "var(--a-text-3)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-3)"; }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: p === page ? "var(--a-accent-bg)" : "transparent",
                color: p === page ? "var(--a-accent)" : "var(--a-text-4)",
                border: p === page ? "1px solid var(--a-accent)" : "1px solid var(--a-border)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
