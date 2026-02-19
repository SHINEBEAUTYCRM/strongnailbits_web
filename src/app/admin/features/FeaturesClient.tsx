"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Search, ChevronRight, SlidersHorizontal } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
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

interface Variant {
  id: string;
  feature_id: string;
  name_uk: string | null;
  name_ru: string | null;
  color_code: string | null;
  position: number | null;
}

interface PendingChange {
  is_filter?: boolean;
  filter_position?: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Всі типи" },
  { value: "S", label: "Selectbox" },
  { value: "M", label: "Multiple" },
  { value: "T", label: "Text" },
  { value: "N", label: "Number" },
  { value: "C", label: "Checkbox" },
  { value: "E", label: "Extended" },
];

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  S: { label: "Select", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  M: { label: "Multiple", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  T: { label: "Text", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  N: { label: "Number", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  C: { label: "Checkbox", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  E: { label: "Extended", color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
};

const TABS = [
  { value: "all", label: "Всі" },
  { value: "filter", label: "Фільтри" },
  { value: "hidden", label: "Приховані" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FeaturesClient({ features }: { features: Feature[] }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabValue>("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [variantsCache, setVariantsCache] = useState<Record<string, Variant[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, PendingChange>>({});
  const [saving, setSaving] = useState(false);
  const [localFeatures, setLocalFeatures] = useState(features);
  const positionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => setLocalFeatures(features), [features]);

  /* ---------- Filtering ---------- */
  const maxProducts = useMemo(
    () => Math.max(...localFeatures.map((f) => f.products_count), 1),
    [localFeatures],
  );

  const filtered = useMemo(() => {
    let list = localFeatures;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (f) =>
          f.name_uk?.toLowerCase().includes(q) || f.name_ru?.toLowerCase().includes(q),
      );
    }
    if (tab === "filter") list = list.filter((f) => f.is_filter);
    if (tab === "hidden") list = list.filter((f) => !f.is_filter);
    if (typeFilter) list = list.filter((f) => f.feature_type === typeFilter);
    return list;
  }, [localFeatures, query, tab, typeFilter]);

  /* ---------- Expand / variants ---------- */
  const toggleExpand = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(id);
      if (!variantsCache[id]) {
        setLoadingVariants(id);
        try {
          const res = await fetch(`/api/admin/features/${id}/variants`);
          const data = await res.json();
          setVariantsCache((prev) => ({ ...prev, [id]: data }));
        } catch {
          setVariantsCache((prev) => ({ ...prev, [id]: [] }));
        }
        setLoadingVariants(null);
      }
    },
    [expandedId, variantsCache],
  );

  /* ---------- Toggle filter (optimistic) ---------- */
  const toggleFilter = useCallback(
    (id: string, current: boolean) => {
      const next = !current;
      setLocalFeatures((prev) =>
        prev.map((f) => (f.id === id ? { ...f, is_filter: next } : f)),
      );
      setPending((prev) => ({
        ...prev,
        [id]: { ...prev[id], is_filter: next },
      }));
    },
    [],
  );

  /* ---------- Position change (debounced) ---------- */
  const changePosition = useCallback((id: string, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    setLocalFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, filter_position: num } : f)),
    );
    if (positionTimers.current[id]) clearTimeout(positionTimers.current[id]);
    positionTimers.current[id] = setTimeout(() => {
      setPending((prev) => ({
        ...prev,
        [id]: { ...prev[id], filter_position: num },
      }));
    }, 600);
  }, []);

  /* ---------- Save ---------- */
  const pendingCount = Object.keys(pending).length;

  const save = useCallback(async () => {
    setSaving(true);
    const updates = Object.entries(pending).map(([id, changes]) => ({ id, ...changes }));
    try {
      await fetch("/api/admin/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      setPending({});
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  }, [pending]);

  const discard = useCallback(() => {
    setPending({});
    setLocalFeatures(features);
  }, [features]);

  /* ---------- Render ---------- */
  return (
    <>
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--a-text-5)" }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук за назвою..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{
              background: "var(--a-bg-card)",
              border: "1px solid var(--a-border)",
              color: "var(--a-text-body)",
            }}
          />
        </div>

        <div
          className="flex gap-1.5 rounded-lg p-1"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                background: tab === t.value ? "var(--a-accent-bg)" : "transparent",
                color: tab === t.value ? "var(--a-accent)" : "var(--a-text-4)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
            color: "var(--a-text-body)",
          }}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <SlidersHorizontal
            className="w-8 h-8 mx-auto mb-3"
            style={{ color: "var(--a-text-5)" }}
          />
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
                  {["#", "Характеристика", "Тип", "Вар.", "Товарів", "Фільтр", "Позиц."].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: "var(--a-text-5)" }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <FeatureRow
                    key={f.id}
                    feature={f}
                    index={i + 1}
                    maxProducts={maxProducts}
                    expanded={expandedId === f.id}
                    variants={variantsCache[f.id] || null}
                    loadingVariants={loadingVariants === f.id}
                    onToggleExpand={() => toggleExpand(f.id)}
                    onToggleFilter={() => toggleFilter(f.id, f.is_filter)}
                    onPositionChange={(val) => changePosition(f.id, val)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom save bar */}
      {pendingCount > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
          style={{
            background: "var(--a-bg-card)",
            borderTop: "1px solid var(--a-border)",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--a-text)" }}>
            {pendingCount} {pendingCount === 1 ? "зміна" : pendingCount < 5 ? "зміни" : "змін"} не збережено
          </p>
          <div className="flex gap-2">
            <button
              onClick={discard}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}
            >
              Скасувати
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--a-accent-btn)" }}
            >
              {saving ? "Збереження..." : "Зберегти"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature Row                                                        */
/* ------------------------------------------------------------------ */

function FeatureRow({
  feature: f,
  index,
  maxProducts,
  expanded,
  variants,
  loadingVariants,
  onToggleExpand,
  onToggleFilter,
  onPositionChange,
}: {
  feature: Feature;
  index: number;
  maxProducts: number;
  expanded: boolean;
  variants: Variant[] | null;
  loadingVariants: boolean;
  onToggleExpand: () => void;
  onToggleFilter: () => void;
  onPositionChange: (v: string) => void;
}) {
  const badge = TYPE_BADGE[f.feature_type || ""] || {
    label: f.feature_type || "?",
    color: "var(--a-text-4)",
    bg: "var(--a-bg-input)",
  };
  const barWidth = maxProducts > 0 ? (f.products_count / maxProducts) * 100 : 0;
  const dimmed = f.products_count === 0;

  return (
    <>
      <tr
        className="group cursor-pointer transition-colors"
        style={{
          borderBottom: "1px solid var(--a-border)",
          background: expanded ? "var(--a-bg-card)" : "transparent",
          opacity: dimmed ? 0.5 : 1,
        }}
        onClick={onToggleExpand}
        onMouseEnter={(e) => {
          if (!expanded)
            e.currentTarget.style.background = "var(--a-bg-card)";
        }}
        onMouseLeave={(e) => {
          if (!expanded)
            e.currentTarget.style.background = "transparent";
        }}
      >
        {/* # */}
        <td className="px-4 py-3 font-mono text-xs tabular-nums" style={{ color: "var(--a-text-5)", width: 48 }}>
          {index}
        </td>

        {/* Name */}
        <td className="px-4 py-3" style={{ minWidth: 200 }}>
          <div className="flex items-center gap-2">
            <ChevronRight
              className="w-4 h-4 shrink-0 transition-transform duration-200"
              style={{
                color: "var(--a-text-5)",
                transform: expanded ? "rotate(90deg)" : "rotate(0)",
              }}
            />
            <div>
              <p className="font-medium" style={{ color: "var(--a-text)" }}>
                {f.name_uk || "—"}
              </p>
              {f.name_ru && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--a-text-5)" }}>
                  {f.name_ru}
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Type badge */}
        <td className="px-4 py-3">
          <span
            className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold"
            style={{ color: badge.color, background: badge.bg }}
          >
            {badge.label}
          </span>
        </td>

        {/* Variants count */}
        <td
          className="px-4 py-3 font-mono text-xs tabular-nums"
          style={{ color: "var(--a-text)" }}
        >
          {f.variants_count}
        </td>

        {/* Products count + bar */}
        <td className="px-4 py-3" style={{ minWidth: 120 }}>
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-xs tabular-nums shrink-0"
              style={{ color: "var(--a-text)", minWidth: 40 }}
            >
              {f.products_count.toLocaleString("uk")}
            </span>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--a-bg-input)", maxWidth: 60 }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${barWidth}%`,
                  background: "var(--a-accent)",
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>
        </td>

        {/* Filter toggle */}
        <td className="px-4 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFilter();
            }}
            className="relative w-9 h-5 rounded-full transition-colors duration-200"
            style={{
              background: f.is_filter ? "#22c55e" : "var(--a-bg-input)",
              border: f.is_filter ? "none" : "1px solid var(--a-border)",
            }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
              style={{
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transform: f.is_filter ? "translateX(18px)" : "translateX(2px)",
              }}
            />
          </button>
        </td>

        {/* Position */}
        <td className="px-4 py-3">
          <input
            type="number"
            value={f.filter_position ?? 0}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onPositionChange(e.target.value)}
            className="w-14 px-2 py-1 rounded-md text-xs font-mono tabular-nums text-center outline-none"
            style={{
              background: "var(--a-bg-input)",
              border: "1px solid var(--a-border)",
              color: "var(--a-text)",
            }}
          />
        </td>
      </tr>

      {/* Expanded variants panel */}
      {expanded && (
        <tr>
          <td
            colSpan={7}
            className="px-4 py-4"
            style={{ background: "var(--a-bg-card)", borderBottom: "1px solid var(--a-border)" }}
          >
            <p className="text-xs font-medium mb-3" style={{ color: "var(--a-text-3)" }}>
              Варіанти характеристики &ldquo;{f.name_uk}&rdquo; ({f.variants_count})
            </p>
            {loadingVariants ? (
              <div className="flex gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-lg animate-pulse"
                    style={{
                      width: 80 + Math.random() * 40,
                      background: "var(--a-bg-input)",
                    }}
                  />
                ))}
              </div>
            ) : variants && variants.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{
                      background: "var(--a-bg-input)",
                      border: "1px solid var(--a-border)",
                    }}
                  >
                    {v.color_code && (
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{
                          background: v.color_code,
                          border: "1px solid var(--a-border)",
                        }}
                      />
                    )}
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--a-text)" }}>
                        {v.name_uk || "—"}
                      </p>
                      {v.name_ru && v.name_ru !== v.name_uk && (
                        <p className="text-[10px]" style={{ color: "var(--a-text-5)" }}>
                          {v.name_ru}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--a-text-5)" }}>
                Немає варіантів
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
