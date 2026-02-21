"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BoundFeature {
  id: string;
  feature_id: string;
  feature_name_uk: string;
  feature_name_ru: string | null;
  feature_type: string;
  is_required: boolean;
  position: number;
  variants_count: number;
}

interface AvailableFeature {
  id: string;
  name_uk: string;
  feature_type: string;
  is_filter: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  S: "select", M: "multi", T: "text", N: "number", C: "bool", E: "color",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CategoryFeatures({ categoryId }: { categoryId: string }) {
  const [features, setFeatures] = useState<BoundFeature[]>([]);
  const [available, setAvailable] = useState<AvailableFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/category-features?category_id=${categoryId}`);
      const data = await res.json();
      setFeatures(data.features || []);
      setAvailable(data.available || []);
    } catch {
      setFeatures([]);
      setAvailable([]);
    }
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    if (categoryId) fetchData();
  }, [categoryId, fetchData]);

  const addFeature = (featureId: string) => {
    const feat = available.find((a) => a.id === featureId);
    if (!feat) return;

    setFeatures((prev) => [
      ...prev,
      {
        id: "",
        feature_id: feat.id,
        feature_name_uk: feat.name_uk,
        feature_name_ru: null,
        feature_type: feat.feature_type,
        is_required: false,
        position: prev.length,
        variants_count: 0,
      },
    ]);
    setAvailable((prev) => prev.filter((a) => a.id !== featureId));
    setDropdownOpen(false);
  };

  const addAll = () => {
    const newFeatures = available.map((a, i) => ({
      id: "",
      feature_id: a.id,
      feature_name_uk: a.name_uk,
      feature_name_ru: null,
      feature_type: a.feature_type,
      is_required: false,
      position: features.length + i,
      variants_count: 0,
    }));
    setFeatures((prev) => [...prev, ...newFeatures]);
    setAvailable([]);
  };

  const removeFeature = (idx: number) => {
    const removed = features[idx];
    setFeatures((prev) => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, position: i })));
    if (removed) {
      setAvailable((prev) => [
        ...prev,
        { id: removed.feature_id, name_uk: removed.feature_name_uk, feature_type: removed.feature_type, is_filter: false },
      ]);
    }
  };

  const moveFeature = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= features.length) return;
    setFeatures((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((f, i) => ({ ...f, position: i }));
    });
  };

  const toggleRequired = (idx: number) => {
    setFeatures((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, is_required: !f.is_required } : f)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const payload = features.map((f) => ({
      feature_id: f.feature_id,
      is_required: f.is_required,
      position: f.position,
    }));

    try {
      const res = await fetch("/api/admin/category-features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId, features: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Помилка збереження");
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        fetchData();
      }
    } catch {
      setError("Помилка мережі");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--a-accent)" }} />
          <h3 className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Характеристики категорії</h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--a-bg-input)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--a-accent)" }} />
          <h3 className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>
            Характеристики категорії
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--a-bg-input)", color: "var(--a-text-4)" }}>
            {features.length}
          </span>
        </div>

        {/* Add dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: "var(--a-accent)", background: "var(--a-accent-bg)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Додати
          </button>
          {dropdownOpen && available.length > 0 && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-lg py-1 max-h-64 overflow-y-auto"
              style={{
                background: "var(--a-bg-card)",
                border: "1px solid var(--a-border)",
                boxShadow: "0 10px 30px var(--a-shadow)",
                minWidth: 220,
              }}
            >
              {available.map((a) => (
                <button
                  key={a.id}
                  onClick={() => addFeature(a.id)}
                  className="w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between"
                  style={{ color: "var(--a-text)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="truncate">{a.name_uk}</span>
                  <span className="text-[10px] shrink-0 ml-2" style={{ color: "var(--a-text-5)" }}>
                    {TYPE_LABEL[a.feature_type] || a.feature_type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bound features list */}
      {features.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--a-text-5)" }}>
          Немає прив&apos;язаних характеристик
        </p>
      ) : (
        <div className="space-y-1.5 mb-4">
          {features.map((f, idx) => (
            <div
              key={f.feature_id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}
            >
              {/* Move */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveFeature(idx, -1)}
                  disabled={idx === 0}
                  className="p-0.5 disabled:opacity-20"
                  style={{ color: "var(--a-text-4)" }}
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveFeature(idx, 1)}
                  disabled={idx === features.length - 1}
                  className="p-0.5 disabled:opacity-20"
                  style={{ color: "var(--a-text-4)" }}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Name + type */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block" style={{ color: "var(--a-text)" }}>
                  {f.feature_name_uk}
                </span>
              </div>

              {/* Type badge */}
              <span className="text-[10px] px-2 py-0.5 rounded shrink-0" style={{ background: "var(--a-bg-card)", color: "var(--a-text-4)" }}>
                {TYPE_LABEL[f.feature_type] || f.feature_type}
              </span>

              {/* Variants count */}
              {["S", "M", "E"].includes(f.feature_type) && (
                <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--a-text-5)" }}>
                  {f.variants_count}v
                </span>
              )}

              {/* Required toggle */}
              <button
                onClick={() => toggleRequired(idx)}
                className="text-[10px] px-2 py-0.5 rounded shrink-0 transition-colors"
                style={{
                  background: f.is_required ? "rgba(239,68,68,0.12)" : "transparent",
                  color: f.is_required ? "#ef4444" : "var(--a-text-5)",
                  border: `1px solid ${f.is_required ? "rgba(239,68,68,0.3)" : "var(--a-border)"}`,
                }}
              >
                {f.is_required ? "req" : "opt"}
              </button>

              {/* Remove */}
              <button
                onClick={() => removeFeature(idx)}
                className="p-1 rounded shrink-0 transition-colors"
                style={{ color: "var(--a-text-4)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-4)"; }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available hint */}
      {available.length > 0 && (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-[11px]" style={{ color: "var(--a-text-5)" }}>
            Не прив&apos;язані: {available.slice(0, 3).map((a) => a.name_uk).join(", ")}
            {available.length > 3 && ` (+${available.length - 3})`}
          </p>
          <button
            onClick={addAll}
            className="text-[11px] font-medium transition-colors"
            style={{ color: "var(--a-accent)" }}
          >
            Додати все
          </button>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="px-3 py-2 rounded-lg text-xs mb-3" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="px-3 py-2 rounded-lg text-xs mb-3" style={{ color: "#22c55e", background: "rgba(34,197,94,0.08)" }}>
          Збережено
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--a-accent-btn)" }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Зберегти прив&apos;язки
      </button>
    </div>
  );
}
