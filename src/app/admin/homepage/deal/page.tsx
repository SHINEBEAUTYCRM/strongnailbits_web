"use client";

import { useState, useEffect, useCallback } from "react";
import { Flame, Pencil, Trash2, Plus, Save, X } from "lucide-react";

/* ─── Types ─── */
interface Deal {
  id: string;
  title_uk: string;
  title_ru: string | null;
  subtitle_uk: string | null;
  subtitle_ru: string | null;
  end_at: string;
  product_ids: string[] | null;
  category_id: string | null;
  cta_text_uk: string | null;
  cta_url: string | null;
  bg_color: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface FormState {
  title_uk: string;
  title_ru: string;
  subtitle_uk: string;
  subtitle_ru: string;
  end_at: string;
  product_ids: string;
  category_id: string;
  cta_text_uk: string;
  cta_url: string;
  bg_color: string;
  is_enabled: boolean;
}

const emptyForm: FormState = {
  title_uk: "",
  title_ru: "",
  subtitle_uk: "",
  subtitle_ru: "",
  end_at: "",
  product_ids: "",
  category_id: "",
  cta_text_uk: "",
  cta_url: "",
  bg_color: "#a855f7",
  is_enabled: true,
};

/* ─── Helpers ─── */
function toLocalDatetime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dealStatus(deal: Deal): { label: string; color: string; bg: string } {
  if (!deal.is_enabled) return { label: "Вимкнена", color: "#9ca3af", bg: "#6b728020" };
  if (new Date(deal.end_at) < new Date()) return { label: "Завершена", color: "#9ca3af", bg: "#6b728020" };
  return { label: "Активна", color: "#4ade80", bg: "#22c55e20" };
}

/* ─── Component ─── */
export default function DealPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* Fetch all deals */
  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/homepage/deal");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDeals(data);
    } catch {
      setToast("Помилка завантаження");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  /* Set form from deal */
  const startEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({
      title_uk: deal.title_uk || "",
      title_ru: deal.title_ru || "",
      subtitle_uk: deal.subtitle_uk || "",
      subtitle_ru: deal.subtitle_ru || "",
      end_at: toLocalDatetime(deal.end_at),
      product_ids: deal.product_ids?.join(", ") || "",
      category_id: deal.category_id || "",
      cta_text_uk: deal.cta_text_uk || "",
      cta_url: deal.cta_url || "",
      bg_color: deal.bg_color || "#a855f7",
      is_enabled: deal.is_enabled,
    });
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  /* Save (create or update) */
  const handleSave = async () => {
    if (!form.title_uk.trim() || !form.end_at) {
      setToast("Заповніть назву та дату закінчення");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setSaving(true);
    try {
      const productIdsArr = form.product_ids
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        ...(editing ? { id: editing.id } : {}),
        title_uk: form.title_uk,
        title_ru: form.title_ru || null,
        subtitle_uk: form.subtitle_uk || null,
        subtitle_ru: form.subtitle_ru || null,
        end_at: new Date(form.end_at).toISOString(),
        product_ids: productIdsArr.length > 0 ? productIdsArr : null,
        category_id: form.category_id || null,
        cta_text_uk: form.cta_text_uk || null,
        cta_url: form.cta_url || null,
        bg_color: form.bg_color || null,
        is_enabled: form.is_enabled,
      };

      const res = await fetch("/api/admin/homepage/deal", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Помилка збереження");
      }

      setToast(editing ? "Акцію оновлено" : "Акцію створено");
      setTimeout(() => setToast(null), 2500);
      setForm(emptyForm);
      setEditing(null);
      await fetchDeals();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Помилка");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  /* Delete */
  const handleDelete = async (id: string) => {
    if (!confirm("Видалити цю акцію?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage/deal", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setToast("Акцію видалено");
      setTimeout(() => setToast(null), 2500);
      if (editing?.id === id) {
        setEditing(null);
        setForm(emptyForm);
      }
      await fetchDeals();
    } catch {
      setToast("Помилка видалення");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  /* Sort: active first, then by end_at desc */
  const sorted = [...deals].sort((a, b) => {
    const aActive = a.is_enabled && new Date(a.end_at) > new Date() ? 0 : 1;
    const bActive = b.is_enabled && new Date(b.end_at) > new Date() ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.end_at).getTime() - new Date(a.end_at).getTime();
  });

  const isCreating = !editing;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
          style={{
            background: toast.includes("Помилка") || toast.includes("Заповніть") ? "#ef4444" : "#22c55e",
            color: "#fff",
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6" style={{ color: "var(--a-accent-btn)" }} />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>
              Акція дня
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>
              Створюйте та керуйте акціями на головній
            </p>
          </div>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer"
          style={{ background: "var(--a-accent-btn)" }}
        >
          <Plus className="w-4 h-4" />
          Створити акцію
        </button>
      </div>

      {/* Content: List + Form */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Deals List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--a-text-2)" }}>
            Список акцій ({deals.length})
          </h2>

          {loading ? (
            <div
              className="text-center py-12 rounded-xl"
              style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
            >
              <p className="text-sm" style={{ color: "var(--a-text-4)" }}>Завантаження...</p>
            </div>
          ) : sorted.length === 0 ? (
            <div
              className="text-center py-12 rounded-xl"
              style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
            >
              <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
                Акцій ще немає. Створіть першу!
              </p>
            </div>
          ) : (
            sorted.map((deal) => {
              const status = dealStatus(deal);
              const isActive = editing?.id === deal.id;
              return (
                <div
                  key={deal.id}
                  className="rounded-xl px-4 py-3 transition-colors"
                  style={{
                    background: "var(--a-bg-card)",
                    border: isActive
                      ? "2px solid var(--a-accent-btn)"
                      : "1px solid var(--a-border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--a-text)" }}
                        >
                          {deal.title_uk}
                        </span>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--a-text-3)" }}>
                        Закінчується:{" "}
                        {new Date(deal.end_at).toLocaleString("uk-UA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {deal.bg_color && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className="w-3 h-3 rounded-full inline-block border border-white/20"
                            style={{ background: deal.bg_color }}
                          />
                          <span className="text-[11px]" style={{ color: "var(--a-text-5)" }}>
                            {deal.bg_color}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(deal)}
                        className="p-1.5 rounded-lg transition-colors cursor-pointer"
                        style={{ color: "var(--a-accent-btn)" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--a-bg-hover)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        title="Редагувати"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(deal.id)}
                        disabled={saving}
                        className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        style={{ color: "#ef4444" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--a-bg-hover)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        title="Видалити"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Form */}
        <div>
          <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--a-text-2)" }}>
            {isCreating ? "Нова акція" : `Редагування: ${editing?.title_uk}`}
          </h2>

          <div
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "var(--a-bg-card)",
              border: "1px solid var(--a-border)",
            }}
          >
            {/* Title UK */}
            <Field label="Назва (UK) *">
              <input
                type="text"
                value={form.title_uk}
                onChange={(e) => setForm((f) => ({ ...f, title_uk: e.target.value }))}
                placeholder="Назва акції українською"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: "var(--a-bg-hover)",
                  border: "1px solid var(--a-border)",
                  color: "var(--a-text)",
                }}
              />
            </Field>

            {/* Title RU */}
            <Field label="Назва (RU)">
              <input
                type="text"
                value={form.title_ru}
                onChange={(e) => setForm((f) => ({ ...f, title_ru: e.target.value }))}
                placeholder="Назва акції російською"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: "var(--a-bg-hover)",
                  border: "1px solid var(--a-border)",
                  color: "var(--a-text)",
                }}
              />
            </Field>

            {/* Subtitles */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Підзаголовок (UK)">
                <input
                  type="text"
                  value={form.subtitle_uk}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle_uk: e.target.value }))}
                  placeholder="Підзаголовок"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "var(--a-bg-hover)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text)",
                  }}
                />
              </Field>
              <Field label="Підзаголовок (RU)">
                <input
                  type="text"
                  value={form.subtitle_ru}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle_ru: e.target.value }))}
                  placeholder="Підзаголовок"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "var(--a-bg-hover)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text)",
                  }}
                />
              </Field>
            </div>

            {/* End at */}
            <Field label="Дата закінчення *">
              <input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: "var(--a-bg-hover)",
                  border: "1px solid var(--a-border)",
                  color: "var(--a-text)",
                  colorScheme: "dark",
                }}
              />
            </Field>

            {/* Product IDs */}
            <Field label="ID товарів (через кому або з нового рядка)">
              <textarea
                value={form.product_ids}
                onChange={(e) => setForm((f) => ({ ...f, product_ids: e.target.value }))}
                placeholder="uuid1, uuid2..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-y"
                style={{
                  background: "var(--a-bg-hover)",
                  border: "1px solid var(--a-border)",
                  color: "var(--a-text)",
                }}
              />
            </Field>

            {/* Category ID */}
            <Field label="Category ID (UUID)">
              <input
                type="text"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                placeholder="UUID категорії (опціонально)"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: "var(--a-bg-hover)",
                  border: "1px solid var(--a-border)",
                  color: "var(--a-text)",
                }}
              />
            </Field>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Текст кнопки (UK)">
                <input
                  type="text"
                  value={form.cta_text_uk}
                  onChange={(e) => setForm((f) => ({ ...f, cta_text_uk: e.target.value }))}
                  placeholder="Купити зі знижкою"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "var(--a-bg-hover)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text)",
                  }}
                />
              </Field>
              <Field label="URL кнопки">
                <input
                  type="text"
                  value={form.cta_url}
                  onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
                  placeholder="/category/sale"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "var(--a-bg-hover)",
                    border: "1px solid var(--a-border)",
                    color: "var(--a-text)",
                  }}
                />
              </Field>
            </div>

            {/* BG Color + Toggle */}
            <div className="flex items-end gap-4">
              <Field label="Колір фону">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.bg_color}
                    onChange={(e) => setForm((f) => ({ ...f, bg_color: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                    style={{ background: "transparent" }}
                  />
                  <span className="text-xs" style={{ color: "var(--a-text-5)" }}>
                    {form.bg_color}
                  </span>
                </div>
              </Field>

              <div className="flex items-center gap-3 pb-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_enabled: !f.is_enabled }))}
                  className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors cursor-pointer"
                  style={{
                    background: form.is_enabled ? "var(--a-accent-btn)" : "var(--a-border)",
                  }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{
                      transform: form.is_enabled ? "translateX(16px)" : "translateX(0)",
                    }}
                  />
                </button>
                <span className="text-sm" style={{ color: "var(--a-text-3)" }}>
                  {form.is_enabled ? "Активна" : "Вимкнена"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
                style={{ background: "var(--a-accent-btn)" }}
              >
                <Save className="w-4 h-4" />
                {saving ? "Збереження..." : isCreating ? "Створити" : "Зберегти"}
              </button>
              {editing && (
                <button
                  onClick={startCreate}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    color: "var(--a-text-3)",
                    border: "1px solid var(--a-border)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--a-bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <X className="w-4 h-4" />
                  Скасувати
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Local Field component ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--a-text-3)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
