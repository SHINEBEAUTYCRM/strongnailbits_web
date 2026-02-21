"use client";

import { useState, useEffect, useCallback } from "react";
import { SlidersHorizontal, Save, Loader2, ChevronDown } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Variant {
  id: string;
  feature_id: string;
  name_uk: string | null;
  name_ru: string | null;
  color_code: string | null;
  position: number | null;
  metadata: Record<string, unknown> | null;
}

interface FeatureValue {
  feature_id: string;
  feature_name_uk: string | null;
  feature_name_ru: string | null;
  feature_type: string;
  variant_id: string | null;
  variant_ids: (string | null)[];
  value_text: string | null;
  variants: Variant[];
}

interface FormValue {
  feature_id: string;
  variant_id: string | null;
  variant_ids: string[];
  value_text: string;
  value_boolean: boolean;
}

const INITIAL_VISIBLE = 10;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProductFeatures({
  productId,
  categoryId,
}: {
  productId: string;
  categoryId: string;
}) {
  const [features, setFeatures] = useState<FeatureValue[]>([]);
  const [form, setForm] = useState<Record<string, FormValue>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/product-features?product_id=${productId}`);
      const data = await res.json();
      const values: FeatureValue[] = data.values || [];
      setFeatures(values);

      const formMap: Record<string, FormValue> = {};
      for (const fv of values) {
        formMap[fv.feature_id] = {
          feature_id: fv.feature_id,
          variant_id: fv.variant_id || null,
          variant_ids: (fv.variant_ids || []).filter(Boolean) as string[],
          value_text: fv.value_text || "",
          value_boolean: fv.value_text === "true",
        };
      }
      setForm(formMap);
    } catch {
      setFeatures([]);
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    if (productId) fetchData();
  }, [productId, categoryId, fetchData]);

  const updateForm = useCallback((featureId: string, patch: Partial<FormValue>) => {
    setForm((prev) => ({
      ...prev,
      [featureId]: { ...prev[featureId], ...patch },
    }));
  }, []);

  const toggleMultiVariant = useCallback((featureId: string, variantId: string) => {
    setForm((prev) => {
      const current = prev[featureId]?.variant_ids || [];
      const next = current.includes(variantId)
        ? current.filter((id) => id !== variantId)
        : [...current, variantId];
      return {
        ...prev,
        [featureId]: { ...prev[featureId], variant_ids: next },
      };
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const values = features.map((f) => {
      const fv = form[f.feature_id];
      if (!fv) return null;

      const base: Record<string, unknown> = { feature_id: f.feature_id };

      switch (f.feature_type) {
        case "S":
        case "E":
          if (fv.variant_id) base.variant_id = fv.variant_id;
          break;
        case "M":
          if (fv.variant_ids.length > 0) base.variant_ids = fv.variant_ids;
          break;
        case "C":
          base.value_boolean = fv.value_boolean;
          break;
        case "N":
          if (fv.value_text) base.value_text = fv.value_text;
          break;
        default:
          if (fv.value_text) base.value_text = fv.value_text;
          break;
      }

      return base;
    }).filter(Boolean);

    try {
      const res = await fetch("/api/admin/product-features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, values }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Помилка збереження");
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Помилка мережі");
    }
    setSaving(false);
  };

  const filledCount = features.filter((f) => {
    const fv = form[f.feature_id];
    if (!fv) return false;
    if (["S", "E"].includes(f.feature_type)) return !!fv.variant_id;
    if (f.feature_type === "M") return fv.variant_ids.length > 0;
    if (f.feature_type === "C") return fv.value_boolean;
    return !!fv.value_text;
  }).length;

  const visibleFeatures = expanded ? features : features.slice(0, INITIAL_VISIBLE);
  const hasMore = features.length > INITIAL_VISIBLE;

  if (loading) {
    return (
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--a-accent)" }} />
          <h3 className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Характеристики</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--a-bg-input)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (features.length === 0) return null;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="w-full flex items-center justify-between mb-0"
        style={{ cursor: "pointer" }}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--a-accent)" }} />
          <h3 className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>
            Характеристики
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--a-bg-input)", color: "var(--a-text-4)" }}>
            {filledCount}/{features.length}
          </span>
        </div>
        <ChevronDown
          className="w-4 h-4 transition-transform duration-200"
          style={{ color: "var(--a-text-4)", transform: collapsed ? "rotate(-90deg)" : "rotate(0)" }}
        />
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-3">
          {visibleFeatures.map((f) => (
            <FeatureField
              key={f.feature_id}
              feature={f}
              value={form[f.feature_id]}
              onChange={(patch) => updateForm(f.feature_id, patch)}
              onToggleMulti={(vid) => toggleMultiVariant(f.feature_id, vid)}
            />
          ))}

          {/* Show more / less */}
          {hasMore && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="w-full py-2 text-center text-xs font-medium rounded-lg transition-colors"
              style={{ color: "var(--a-accent)", background: "var(--a-accent-bg)" }}
            >
              {expanded
                ? "Згорнути"
                : `Ще ${features.length - INITIAL_VISIBLE} характеристик...`}
            </button>
          )}

          {/* Error / Success */}
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
              {error}
            </div>
          )}
          {success && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ color: "#22c55e", background: "rgba(34,197,94,0.08)" }}>
              Збережено
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--a-accent-btn)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Зберегти характеристики
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual feature field                                           */
/* ------------------------------------------------------------------ */

function FeatureField({
  feature: f,
  value: fv,
  onChange,
  onToggleMulti,
}: {
  feature: FeatureValue;
  value: FormValue | undefined;
  onChange: (patch: Partial<FormValue>) => void;
  onToggleMulti: (variantId: string) => void;
}) {
  const label = f.feature_name_uk || "—";

  switch (f.feature_type) {
    /* ── Select ── */
    case "S":
      return (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
            {label}
          </label>
          <select
            value={fv?.variant_id || ""}
            onChange={(e) => onChange({ variant_id: e.target.value || null })}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer transition-colors"
            style={{
              background: "var(--a-bg-input)",
              border: "1px solid var(--a-border)",
              color: "var(--a-text)",
            }}
          >
            <option value="">— Не вказано —</option>
            {f.variants.map((v) => (
              <option key={v.id} value={v.id}>{v.name_uk || "—"}</option>
            ))}
          </select>
        </div>
      );

    /* ── Color (select with color dots) ── */
    case "E":
      return (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
            {label}
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onChange({ variant_id: null })}
              className="px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                background: !fv?.variant_id ? "var(--a-accent-bg)" : "var(--a-bg-input)",
                color: !fv?.variant_id ? "var(--a-accent)" : "var(--a-text-4)",
                border: `1px solid ${!fv?.variant_id ? "var(--a-accent)" : "var(--a-border)"}`,
              }}
            >
              —
            </button>
            {f.variants.map((v) => {
              const selected = fv?.variant_id === v.id;
              const hex = v.color_code || (v.metadata as Record<string, string>)?.hex || null;
              return (
                <button
                  key={v.id}
                  onClick={() => onChange({ variant_id: v.id })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: selected ? "var(--a-accent-bg)" : "var(--a-bg-input)",
                    color: selected ? "var(--a-accent)" : "var(--a-text)",
                    border: `1px solid ${selected ? "var(--a-accent)" : "var(--a-border)"}`,
                  }}
                >
                  {hex && (
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ background: hex, border: "1px solid var(--a-border)" }}
                    />
                  )}
                  {v.name_uk || "—"}
                </button>
              );
            })}
          </div>
        </div>
      );

    /* ── Multiselect ── */
    case "M":
      return (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
            {label}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {f.variants.map((v) => {
              const checked = fv?.variant_ids?.includes(v.id) || false;
              return (
                <button
                  key={v.id}
                  onClick={() => onToggleMulti(v.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: checked ? "var(--a-accent-bg)" : "var(--a-bg-input)",
                    color: checked ? "var(--a-accent)" : "var(--a-text)",
                    border: `1px solid ${checked ? "var(--a-accent)" : "var(--a-border)"}`,
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
                    style={{
                      background: checked ? "var(--a-accent-btn)" : "transparent",
                      border: `1.5px solid ${checked ? "var(--a-accent-btn)" : "var(--a-text-5)"}`,
                    }}
                  >
                    {checked && (
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {v.name_uk || "—"}
                </button>
              );
            })}
          </div>
        </div>
      );

    /* ── Number ── */
    case "N":
      return (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
            {label}
          </label>
          <input
            type="number"
            value={fv?.value_text || ""}
            onChange={(e) => onChange({ value_text: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              background: "var(--a-bg-input)",
              border: "1px solid var(--a-border)",
              color: "var(--a-text)",
            }}
            placeholder="0"
          />
        </div>
      );

    /* ── Boolean ── */
    case "C":
      return (
        <div className="flex items-center justify-between py-1">
          <label className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>
            {label}
          </label>
          <button
            onClick={() => onChange({ value_boolean: !fv?.value_boolean, value_text: !fv?.value_boolean ? "true" : "" })}
            className="relative w-9 h-5 rounded-full transition-colors duration-200"
            style={{
              background: fv?.value_boolean ? "#22c55e" : "var(--a-bg-input)",
              border: fv?.value_boolean ? "none" : "1px solid var(--a-border)",
            }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
              style={{
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transform: fv?.value_boolean ? "translateX(18px)" : "translateX(2px)",
              }}
            />
          </button>
        </div>
      );

    /* ── Text (default) ── */
    default:
      return (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
            {label}
          </label>
          <input
            type="text"
            value={fv?.value_text || ""}
            onChange={(e) => onChange({ value_text: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              background: "var(--a-bg-input)",
              border: "1px solid var(--a-border)",
              color: "var(--a-text)",
            }}
            placeholder="Введіть значення..."
          />
        </div>
      );
  }
}
