"use client";

import { useState, useEffect, useCallback } from "react";
import { PanelTop, Plus, Pencil, Trash2, Loader2, X, Save, ChevronUp, ChevronDown } from "lucide-react";

/* ─── Types ─── */
interface TopBarLink {
  id: string;
  label_uk: string;
  label_ru: string | null;
  url: string;
  position: "left" | "right";
  icon: string | null;
  sort_order: number;
  is_enabled: boolean;
}

const EMPTY: Omit<TopBarLink, "id"> = {
  label_uk: "",
  label_ru: "",
  url: "",
  position: "left",
  icon: "",
  sort_order: 0,
  is_enabled: true,
};

export default function TopBarPage() {
  const [links, setLinks] = useState<TopBarLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<TopBarLink, "id">>(EMPTY);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/homepage/top-bar");
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
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

  const openEdit = (link: TopBarLink) => {
    setEditId(link.id);
    setForm({
      label_uk: link.label_uk,
      label_ru: link.label_ru || "",
      url: link.url,
      position: link.position,
      icon: link.icon || "",
      sort_order: link.sort_order,
      is_enabled: link.is_enabled,
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
    if (!form.label_uk.trim()) { setError("Label (UK) обов'язковий"); return; }
    if (!form.url.trim()) { setError("URL обов'язковий"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/homepage/top-bar", {
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
    if (!confirm("Видалити цей лінк?")) return;
    try {
      const res = await fetch("/api/admin/homepage/top-bar", {
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

  const handleToggle = async (link: TopBarLink) => {
    try {
      await fetch("/api/admin/homepage/top-bar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: link.id, is_enabled: !link.is_enabled }),
      });
      await fetchData();
    } catch {
      /* ignore */
    }
  };

  const moveSortOrder = async (link: TopBarLink, direction: "up" | "down") => {
    const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((l) => l.id === link.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const updates = [
      { id: sorted[idx].id, sort_order: sorted[swapIdx].sort_order },
      { id: sorted[swapIdx].id, sort_order: sorted[idx].sort_order },
    ];

    try {
      await fetch("/api/admin/homepage/top-bar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
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
          <PanelTop className="w-6 h-6" style={{ color: "var(--a-accent-btn)" }} />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>
              Top Bar
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>
              {links.length} лінків
            </p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--a-accent-btn)" }}
        >
          <Plus className="w-4 h-4" /> Додати лінк
        </button>
      </div>

      {/* Link Rows */}
      {links.length === 0 && !showForm ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
            Ще немає лінків. Додайте перший!
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden mb-6"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-[1fr_1.5fr_80px_80px_60px_90px] gap-3 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "var(--a-text-5)", borderBottom: "1px solid var(--a-border)" }}
          >
            <span>Label</span>
            <span>URL</span>
            <span>Position</span>
            <span>Order</span>
            <span>Status</span>
            <span className="text-right">Дії</span>
          </div>

          {links.map((link) => (
            <div
              key={link.id}
              className="grid grid-cols-[1fr_1.5fr_80px_80px_60px_90px] gap-3 px-4 py-3 items-center transition-colors"
              style={{ borderBottom: "1px solid var(--a-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* Label */}
              <span className="text-sm font-medium truncate" style={{ color: "var(--a-text)" }}>
                {link.label_uk}
              </span>

              {/* URL */}
              <span className="text-xs font-mono truncate" style={{ color: "var(--a-text-4)" }}>
                {link.url}
              </span>

              {/* Position badge */}
              <span
                className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium w-fit"
                style={
                  link.position === "left"
                    ? { background: "#1e3a5f", color: "#60a5fa" }
                    : { background: "#3b1f54", color: "#c084fc" }
                }
              >
                {link.position}
              </span>

              {/* Sort order with arrows */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveSortOrder(link, "up")}
                  className="p-0.5 rounded hover:opacity-70"
                  style={{ color: "var(--a-text-4)" }}
                  title="Вгору"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <span
                  className="text-[11px] font-mono px-1"
                  style={{ color: "var(--a-text-5)" }}
                >
                  {link.sort_order}
                </span>
                <button
                  onClick={() => moveSortOrder(link, "down")}
                  className="p-0.5 rounded hover:opacity-70"
                  style={{ color: "var(--a-text-4)" }}
                  title="Вниз"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Toggle */}
              <button
                onClick={() => handleToggle(link)}
                className="shrink-0 w-10 h-5 rounded-full relative transition-colors cursor-pointer"
                style={{ background: link.is_enabled ? "#4ade80" : "#6b7280" }}
                title={link.is_enabled ? "Увімкнено" : "Вимкнено"}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: link.is_enabled ? "calc(100% - 18px)" : "2px" }}
                />
              </button>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => openEdit(link)}
                  className="p-1.5 rounded-lg hover:opacity-80"
                  style={{ color: "var(--a-text-3)" }}
                  title="Редагувати"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  className="p-1.5 rounded-lg hover:opacity-80"
                  style={{ color: "#f87171" }}
                  title="Видалити"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
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
              {editId ? "Редагувати лінк" : "Новий лінк"}
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
            <Field label="Label (UK) *" value={form.label_uk} onChange={(v) => set("label_uk", v)} />
            <Field label="Label (RU)" value={form.label_ru || ""} onChange={(v) => set("label_ru", v)} />
            <Field label="URL *" value={form.url} onChange={(v) => set("url", v)} placeholder="https://..." />

            {/* Position select */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
                Position
              </label>
              <select
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}
              >
                <option value="left">left</option>
                <option value="right">right</option>
              </select>
            </div>

            <Field label="Icon (Lucide name)" value={form.icon || ""} onChange={(v) => set("icon", v)} placeholder="Phone, Mail, MapPin..." />
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
