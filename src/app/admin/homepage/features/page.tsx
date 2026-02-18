"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Plus, Pencil, Trash2, Loader2, X, Save } from "lucide-react";

/* ─── Types ─── */
interface Feature {
  id: string;
  title_uk: string;
  title_ru: string | null;
  description_uk: string | null;
  description_ru: string | null;
  icon: string | null;
  color: string;
  link_url: string | null;
  sort_order: number;
  is_enabled: boolean;
}

const ICON_OPTIONS = [
  "Truck", "Shield", "ShieldCheck", "Phone", "Banknote", "Heart", "Star",
  "Clock", "Gift", "RotateCcw", "Zap", "Award", "CheckCircle", "Lock",
  "Headphones", "MapPin", "CreditCard", "Package", "ThumbsUp", "Smile",
];

const EMPTY: Omit<Feature, "id"> = {
  title_uk: "",
  title_ru: "",
  description_uk: "",
  description_ru: "",
  icon: "Truck",
  color: "#D6264A",
  link_url: "",
  sort_order: 0,
  is_enabled: true,
};

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Feature, "id">>(EMPTY);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/homepage/features");
      if (res.ok) {
        const data = await res.json();
        setFeatures(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const set = (key: string, val: string | number | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY);
    setShowForm(true);
    setError("");
  };

  const openEdit = (f: Feature) => {
    setEditId(f.id);
    setForm({
      title_uk: f.title_uk,
      title_ru: f.title_ru || "",
      description_uk: f.description_uk || "",
      description_ru: f.description_ru || "",
      icon: f.icon || "Truck",
      color: f.color || "#D6264A",
      link_url: f.link_url || "",
      sort_order: f.sort_order,
      is_enabled: f.is_enabled,
    });
    setShowForm(true);
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setError("");
  };

  const handleSave = async () => {
    if (!form.title_uk.trim()) { setError("Title (UK) обов'язковий"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/homepage/features", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { ...form, id: editId } : form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Помилка збереження"); setSaving(false); return; }
      closeForm();
      await fetchData();
    } catch {
      setError("Network error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Видалити цю фічу?")) return;
    try {
      const res = await fetch("/api/admin/homepage/features", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) await fetchData();
    } catch {
      /* ignore */
    }
  };

  const handleToggle = async (f: Feature) => {
    try {
      await fetch("/api/admin/homepage/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: f.id, is_enabled: !f.is_enabled }),
      });
      await fetchData();
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--a-text-4)" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6" style={{ color: "var(--a-accent-btn)" }} />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>
              Сервіс і довіра
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>
              {features.length} USP-блоків
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--a-accent-btn)" }}
        >
          <Plus className="w-4 h-4" /> Додати
        </button>
      </div>

      {/* Feature Cards */}
      {features.length === 0 && !showForm ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
            Ще немає фіч. Створіть першу!
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {features.map((f) => (
            <div
              key={f.id}
              className="rounded-xl p-4 flex items-center gap-4 transition-colors"
              style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
            >
              {/* Icon circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                style={{ background: f.color || "#D6264A" }}
                title={f.icon || "—"}
              >
                {(f.icon || "?").slice(0, 2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--a-text)" }}>
                    {f.title_uk}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
                    style={{ background: "var(--a-border)", color: "var(--a-text-5)" }}
                  >
                    {f.icon || "—"}
                  </span>
                </div>
                {f.description_uk && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--a-text-4)" }}>
                    {f.description_uk}
                  </p>
                )}
              </div>

              {/* Sort order */}
              <span
                className="text-[11px] font-mono shrink-0 px-2 py-0.5 rounded"
                style={{ background: "var(--a-border)", color: "var(--a-text-5)" }}
              >
                #{f.sort_order}
              </span>

              {/* Toggle */}
              <button
                onClick={() => handleToggle(f)}
                className="shrink-0 w-10 h-5 rounded-full relative transition-colors cursor-pointer"
                style={{ background: f.is_enabled ? "#4ade80" : "#6b7280" }}
                title={f.is_enabled ? "Увімкнено" : "Вимкнено"}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: f.is_enabled ? "calc(100% - 18px)" : "2px" }}
                />
              </button>

              {/* Actions */}
              <button
                onClick={() => openEdit(f)}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ color: "var(--a-text-3)" }}
                title="Редагувати"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(f.id)}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ color: "#f87171" }}
                title="Видалити"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inline Form */}
      {showForm && (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>
              {editId ? "Редагувати фічу" : "Нова фіча"}
            </h3>
            <button onClick={closeForm} className="p-1 rounded" style={{ color: "var(--a-text-4)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div
              className="mb-4 px-4 py-2.5 rounded-lg text-sm"
              style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title (UK) *" value={form.title_uk} onChange={(v) => set("title_uk", v)} />
            <Field label="Title (RU)" value={form.title_ru || ""} onChange={(v) => set("title_ru", v)} />
            <Field label="Description (UK)" value={form.description_uk || ""} onChange={(v) => set("description_uk", v)} />
            <Field label="Description (RU)" value={form.description_ru || ""} onChange={(v) => set("description_ru", v)} />

            {/* Icon select */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
                Іконка
              </label>
              <select
                value={form.icon || "Truck"}
                onChange={(e) => set("icon", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}
              >
                {ICON_OPTIONS.map((ic) => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
                Колір
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                />
                <span className="text-xs font-mono" style={{ color: "var(--a-text-4)" }}>
                  {form.color}
                </span>
              </div>
            </div>

            <Field label="URL посилання" value={form.link_url || ""} onChange={(v) => set("link_url", v)} placeholder="https://" />
            <Field label="Sort Order" value={String(form.sort_order)} onChange={(v) => set("sort_order", Number(v))} type="number" />
          </div>

          {/* is_enabled */}
          <label className="flex items-center gap-3 cursor-pointer mt-4 py-1">
            <input
              type="checkbox"
              checked={form.is_enabled}
              onChange={(e) => set("is_enabled", e.target.checked)}
              className="w-4 h-4 rounded accent-purple-500"
            />
            <span className="text-sm" style={{ color: "var(--a-text-2)" }}>Увімкнено</span>
          </label>

          {/* Save */}
          <div className="flex justify-end mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--a-accent-btn)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? "Зберегти" : "Створити"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable Field ─── */
function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }}
      />
    </div>
  );
}
