"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  GripVertical,
  Palette,
} from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VariantRow {
  id?: string;
  cs_cart_id?: number | null;
  name_uk: string;
  name_ru: string;
  color_code: string;
  position: number;
  metadata: Record<string, unknown>;
}

interface FeatureData {
  id?: string;
  name_uk: string;
  name_ru: string;
  slug: string;
  feature_type: string;
  is_filter: boolean;
  filter_position: number;
  status: string;
  variants: VariantRow[];
  products_count?: number;
}

const TYPE_OPTIONS = [
  { value: "T", label: "Text" },
  { value: "N", label: "Number" },
  { value: "C", label: "Boolean" },
  { value: "S", label: "Select" },
  { value: "M", label: "Multiselect" },
  { value: "E", label: "Color" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Активна" },
  { value: "disabled", label: "Вимкнена" },
];

const VARIANT_TYPES = new Set(["S", "M", "E"]);

/* ------------------------------------------------------------------ */
/*  Slugify helper (simplified client-side)                            */
/* ------------------------------------------------------------------ */

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye",
  ж: "zh", з: "z", и: "y", і: "i", ї: "yi", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
  ю: "yu", я: "ya", ё: "yo", ы: "y", э: "e", ъ: "",
};

function clientSlugify(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FeatureForm({
  initial,
  isNew,
}: {
  initial: FeatureData;
  isNew: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FeatureData>(initial);
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew && !slugManual && form.name_uk) {
      setForm((prev) => ({ ...prev, slug: clientSlugify(prev.name_uk) }));
    }
  }, [form.name_uk, isNew, slugManual]);

  const hasVariants = VARIANT_TYPES.has(form.feature_type);

  const updateField = useCallback(
    <K extends keyof FeatureData>(key: K, value: FeatureData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /* ---------- Variant operations ---------- */
  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          name_uk: "",
          name_ru: "",
          color_code: "",
          position: prev.variants.length,
          metadata: {},
        },
      ],
    }));
  };

  const updateVariant = (idx: number, key: keyof VariantRow, value: string | number) => {
    setForm((prev) => {
      const variants = [...prev.variants];
      variants[idx] = { ...variants[idx], [key]: value };
      return { ...prev, variants };
    });
  };

  const removeVariant = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx).map((v, i) => ({ ...v, position: i })),
    }));
  };

  const moveVariant = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= form.variants.length) return;
    setForm((prev) => {
      const variants = [...prev.variants];
      [variants[idx], variants[target]] = [variants[target], variants[idx]];
      return { ...prev, variants: variants.map((v, i) => ({ ...v, position: i })) };
    });
  };

  /* ---------- Save ---------- */
  const handleSave = async () => {
    if (!form.name_uk.trim()) {
      setError("Назва (UK) обов'язкова");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name_uk: form.name_uk.trim(),
      name_ru: form.name_ru.trim() || null,
      slug: form.slug.trim(),
      feature_type: form.feature_type,
      is_filter: form.is_filter,
      filter_position: form.filter_position,
      status: form.status,
      variants: hasVariants
        ? form.variants.map((v) => ({
            cs_cart_id: v.cs_cart_id || null,
            name_uk: v.name_uk,
            name_ru: v.name_ru || null,
            color_code: v.color_code || null,
            position: v.position,
            metadata: v.color_code ? { hex: v.color_code } : v.metadata,
          }))
        : undefined,
    };

    try {
      const url = isNew ? "/api/admin/features" : `/api/admin/features/${form.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Помилка збереження");
        setSaving(false);
        return;
      }

      if (isNew && data.feature?.id) {
        router.push(`/admin/attributes/${data.feature.id}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Помилка мережі");
    }
    setSaving(false);
  };

  /* ---------- Delete ---------- */
  const handleDelete = async () => {
    if (!form.id) return;
    if (!confirm("Видалити характеристику? Ця дія незворотна.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/features/${form.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Помилка видалення");
        setDeleting(false);
        return;
      }
      router.push("/admin/attributes");
    } catch {
      alert("Помилка мережі");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        href="/admin/attributes"
        className="inline-flex items-center gap-1.5 text-sm mb-5 transition-colors"
        style={{ color: "var(--a-text-4)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--a-accent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-4)"; }}
      >
        <ArrowLeft className="w-4 h-4" />
        Характеристики
      </Link>

      <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--a-text)" }}>
        {isNew ? "Нова характеристика" : `Редагування: ${initial.name_uk}`}
      </h1>

      {/* Product count info (edit mode) */}
      {!isNew && form.products_count !== undefined && form.products_count > 0 && (
        <div
          className="rounded-lg px-4 py-3 mb-5 text-sm"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#3b82f6" }}
        >
          Використовується в {form.products_count} товарах
        </div>
      )}

      {error && (
        <div
          className="rounded-lg px-4 py-3 mb-5 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
        >
          {error}
        </div>
      )}

      {/* Form card */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
      >
        <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "var(--a-text-4)" }}>
          Основні
        </h2>

        <div className="grid gap-4">
          {/* Name UK */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
              Назва (UK) *
            </label>
            <input
              value={form.name_uk}
              onChange={(e) => updateField("name_uk", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--a-bg-input)",
                border: "1px solid var(--a-border)",
                color: "var(--a-text)",
              }}
              placeholder="Об'єм"
            />
          </div>

          {/* Name RU */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
              Назва (RU)
            </label>
            <input
              value={form.name_ru}
              onChange={(e) => updateField("name_ru", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--a-bg-input)",
                border: "1px solid var(--a-border)",
                color: "var(--a-text)",
              }}
              placeholder="Объём"
            />
          </div>

          {/* Slug / Handle */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
              Handle (slug)
            </label>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                updateField("slug", e.target.value);
              }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono"
              style={{
                background: "var(--a-bg-input)",
                border: "1px solid var(--a-border)",
                color: "var(--a-text)",
              }}
              placeholder="obiem"
            />
          </div>

          {/* Type + Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
                Тип
              </label>
              <select
                value={form.feature_type}
                onChange={(e) => updateField("feature_type", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                style={{
                  background: "var(--a-bg-input)",
                  border: "1px solid var(--a-border)",
                  color: "var(--a-text)",
                }}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
                Статус
              </label>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                style={{
                  background: "var(--a-bg-input)",
                  border: "1px solid var(--a-border)",
                  color: "var(--a-text)",
                }}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Settings card */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
      >
        <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "var(--a-text-4)" }}>
          Налаштування
        </h2>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_filter}
              onChange={(e) => updateField("is_filter", e.target.checked)}
              className="w-4 h-4 rounded accent-purple-600"
            />
            <span className="text-sm" style={{ color: "var(--a-text)" }}>
              Використовувати як фільтр
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
              Позиція фільтра
            </label>
            <input
              type="number"
              value={form.filter_position}
              onChange={(e) => updateField("filter_position", parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={{
                background: "var(--a-bg-input)",
                border: "1px solid var(--a-border)",
                color: "var(--a-text)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Variants card */}
      {hasVariants && (
        <div
          className="rounded-xl p-6 mb-6"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--a-text-4)" }}>
              Варіанти ({form.variants.length})
            </h2>
            <button
              onClick={addVariant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                color: "var(--a-accent)",
                background: "var(--a-accent-bg)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Додати варіант
            </button>
          </div>

          {form.variants.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "var(--a-text-5)" }}>
              Немає варіантів
            </p>
          ) : (
            <div className="space-y-2">
              {form.variants.map((v, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)" }}
                >
                  {/* Move buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveVariant(idx, -1)}
                      disabled={idx === 0}
                      className="p-0.5 rounded disabled:opacity-20"
                      style={{ color: "var(--a-text-4)" }}
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Position */}
                  <span className="text-[11px] font-mono w-5 text-center shrink-0" style={{ color: "var(--a-text-5)" }}>
                    {idx + 1}
                  </span>

                  {/* Color picker for color type */}
                  {form.feature_type === "E" && (
                    <div className="shrink-0 relative">
                      <input
                        type="color"
                        value={v.color_code || "#000000"}
                        onChange={(e) => updateVariant(idx, "color_code", e.target.value)}
                        className="w-8 h-8 rounded-full cursor-pointer border-0 p-0"
                        style={{ background: "transparent" }}
                      />
                      <Palette className="w-3 h-3 absolute bottom-0 right-0 pointer-events-none" style={{ color: "var(--a-text-5)" }} />
                    </div>
                  )}

                  {/* Name UK */}
                  <input
                    value={v.name_uk}
                    onChange={(e) => updateVariant(idx, "name_uk", e.target.value)}
                    placeholder="Значення (UK)"
                    className="flex-1 px-2.5 py-1.5 rounded-md text-sm outline-none min-w-0"
                    style={{
                      background: "var(--a-bg-card)",
                      border: "1px solid var(--a-border)",
                      color: "var(--a-text)",
                    }}
                  />

                  {/* Name RU */}
                  <input
                    value={v.name_ru}
                    onChange={(e) => updateVariant(idx, "name_ru", e.target.value)}
                    placeholder="RU"
                    className="w-32 px-2.5 py-1.5 rounded-md text-sm outline-none"
                    style={{
                      background: "var(--a-bg-card)",
                      border: "1px solid var(--a-border)",
                      color: "var(--a-text)",
                    }}
                  />

                  {/* Delete */}
                  <button
                    onClick={() => removeVariant(idx)}
                    className="p-1.5 rounded-lg shrink-0 transition-colors"
                    style={{ color: "var(--a-text-4)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-4)"; }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--a-accent-btn)" }}
        >
          <Save className="w-4 h-4" />
          {saving ? "Збереження..." : isNew ? "Створити" : "Зберегти"}
        </button>

        {!isNew && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Видалення..." : "Видалити"}
          </button>
        )}
      </div>
    </div>
  );
}
