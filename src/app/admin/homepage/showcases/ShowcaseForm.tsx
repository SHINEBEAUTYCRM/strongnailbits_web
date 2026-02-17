"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

/* ─── Types ─── */

interface RuleData {
  sort?: string;
  has_discount?: boolean;
  is_new?: boolean;
  category_id?: string;
}

interface CategoryOption {
  id: string;
  name_uk: string;
  parent_cs_cart_id: string | null;
  slug: string;
}

interface ShowcaseData {
  id?: string;
  code: string;
  title_uk: string;
  title_ru: string;
  subtitle_uk: string;
  subtitle_ru: string;
  source_type: string;
  rule: RuleData | null;
  sku_list: string[] | null;
  product_limit: number;
  cta_text_uk: string;
  cta_text_ru: string;
  cta_url: string;
  sort_order: number;
  is_enabled: boolean;
}

const EMPTY: ShowcaseData = {
  code: "",
  title_uk: "",
  title_ru: "",
  subtitle_uk: "",
  subtitle_ru: "",
  source_type: "rule",
  rule: { sort: "popular", has_discount: false, is_new: false },
  sku_list: null,
  product_limit: 14,
  cta_text_uk: "",
  cta_text_ru: "",
  cta_url: "",
  sort_order: 0,
  is_enabled: true,
};

/* ─── Helpers ─── */

function parseRule(rule: unknown): RuleData {
  if (rule && typeof rule === "object") return rule as RuleData;
  return { sort: "popular", has_discount: false, is_new: false };
}

function skuListToText(list: string[] | null): string {
  if (!list || !Array.isArray(list)) return "";
  return list.join("\n");
}

function textToSkuList(text: string): string[] | null {
  const items = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

/* ─── Component ─── */

export function ShowcaseForm({ initial, categories = [] }: { initial?: ShowcaseData; categories?: CategoryOption[] }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<ShowcaseData>(() => {
    if (initial) {
      return {
        ...initial,
        rule: parseRule(initial.rule),
        title_ru: initial.title_ru ?? "",
        subtitle_uk: initial.subtitle_uk ?? "",
        subtitle_ru: initial.subtitle_ru ?? "",
        cta_text_uk: initial.cta_text_uk ?? "",
        cta_text_ru: initial.cta_text_ru ?? "",
        cta_url: initial.cta_url ?? "",
      };
    }
    return EMPTY;
  });

  const [skuText, setSkuText] = useState(() => skuListToText(initial?.sku_list ?? null));

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Generic setter */
  const set = <K extends keyof ShowcaseData>(key: K, val: ShowcaseData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  /* Rule field setter */
  const setRule = (key: keyof RuleData, val: string | boolean) =>
    setForm((f) => ({
      ...f,
      rule: { ...parseRule(f.rule), [key]: val },
    }));

  const currentRule = parseRule(form.rule);

  /* ─── Save ─── */
  const handleSave = async () => {
    if (!form.code) {
      setError("Код обов'язковий");
      return;
    }
    if (!form.title_uk) {
      setError("Назва (UK) обов'язкова");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, unknown> = {
        ...form,
        sku_list: form.source_type === "manual" ? textToSkuList(skuText) : null,
        rule: form.source_type === "rule" ? form.rule : null,
      };

      if (isEdit) payload.id = initial?.id;

      const res = await fetch("/api/admin/homepage/showcases", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Помилка збереження");
        setSaving(false);
        return;
      }

      if (!isEdit && data.showcase?.id) {
        router.push(`/admin/homepage/showcases/${data.showcase.id}`);
      } else {
        setSuccess("Збережено");
        setTimeout(() => setSuccess(""), 3000);
        router.refresh();
      }
    } catch (err) {
      console.error("[ShowcaseForm] Save failed:", err);
      setError("Network error");
    }
    setSaving(false);
  };

  /* ─── Delete ─── */
  const handleDelete = async () => {
    if (!confirm("Видалити вітрину? Цю дію не можна відмінити.")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/homepage/showcases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial?.id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push("/admin/homepage/showcases");
      } else {
        setError(data.error || "Помилка видалення");
      }
    } catch (err) {
      console.error("[ShowcaseForm] Delete failed:", err);
      setError("Network error");
    }
    setDeleting(false);
  };

  /* ─── Render ─── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/homepage/showcases"
            className="p-2 rounded-lg"
            style={{ color: "var(--a-text-3)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>
              {isEdit ? "Редагувати вітрину" : "Нова вітрина"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ color: "#f87171", background: "#1c1017", border: "1px solid #7f1d1d" }}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{" "}
              Видалити
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--a-accent-btn)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{" "}
            Зберегти
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm"
          style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm"
          style={{ color: "#4ade80", background: "#052e16", border: "1px solid #166534" }}
        >
          {success}
        </div>
      )}

      {/* Form grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Основне */}
          <Section title="Основне">
            <Field label="Код *" value={form.code} onChange={(v) => set("code", v)} placeholder="popular_products" />
            <Field label="Назва (UK) *" value={form.title_uk} onChange={(v) => set("title_uk", v)} />
            <Field label="Назва (RU)" value={form.title_ru} onChange={(v) => set("title_ru", v)} />
            <Field label="Підзаголовок (UK)" value={form.subtitle_uk} onChange={(v) => set("subtitle_uk", v)} />
            <Field label="Підзаголовок (RU)" value={form.subtitle_ru} onChange={(v) => set("subtitle_ru", v)} />
          </Section>

          {/* Наповнення */}
          <Section title="Наповнення">
            <Select
              label="Тип джерела"
              value={form.source_type}
              onChange={(v) => set("source_type", v)}
              options={[
                { v: "rule", l: "Правило (rule)" },
                { v: "manual", l: "Вручну (manual)" },
              ]}
            />

            {form.source_type === "rule" && (
              <div className="space-y-3 mt-3">
                <Select
                  label="Сортування"
                  value={currentRule.sort || "popular"}
                  onChange={(v) => setRule("sort", v)}
                  options={[
                    { v: "popular", l: "Популярні" },
                    { v: "newest", l: "Найновіші" },
                    { v: "discount", l: "Зі знижкою" },
                    { v: "featured", l: "Рекомендовані" },
                    { v: "random", l: "Випадкові" },
                  ]}
                />
                <Select
                  label="Категорія (фільтр)"
                  value={currentRule.category_id || ""}
                  onChange={(v) => setRule("category_id", v || "")}
                  options={[
                    { v: "", l: "— Всі товари —" },
                    ...categories.map((c) => ({
                      v: c.id,
                      l: c.name_uk + (c.parent_cs_cart_id ? "" : " (розділ)"),
                    })),
                  ]}
                />
                <div className="flex gap-6">
                  <Toggle
                    label="Зі знижкою"
                    checked={currentRule.has_discount ?? false}
                    onChange={(v) => setRule("has_discount", v)}
                  />
                  <Toggle
                    label="Новинки"
                    checked={currentRule.is_new ?? false}
                    onChange={(v) => setRule("is_new", v)}
                  />
                </div>
              </div>
            )}

            {form.source_type === "manual" && (
              <div className="mt-3">
                <TextArea
                  label="SKU список (один на рядок)"
                  value={skuText}
                  onChange={setSkuText}
                  rows={6}
                />
              </div>
            )}
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* CTA та ліміт */}
          <Section title="CTA та ліміт">
            <Field
              label="Ліміт товарів"
              value={String(form.product_limit)}
              onChange={(v) => set("product_limit", Number(v) || 0)}
              type="number"
            />
            <Field label="CTA текст (UK)" value={form.cta_text_uk} onChange={(v) => set("cta_text_uk", v)} placeholder="Дивитись все" />
            <Field label="CTA текст (RU)" value={form.cta_text_ru} onChange={(v) => set("cta_text_ru", v)} placeholder="Смотреть все" />
            <Field label="CTA URL" value={form.cta_url} onChange={(v) => set("cta_url", v)} placeholder="/catalog?sort=popular" />
          </Section>

          {/* Налаштування */}
          <Section title="Налаштування">
            <Field
              label="Порядок сортування"
              value={String(form.sort_order)}
              onChange={(v) => set("sort_order", Number(v) || 0)}
              type="number"
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--a-text-5)" }}>
              Менше число = вище в списку
            </p>
            <Toggle
              label="Увімкнено"
              checked={form.is_enabled}
              onChange={(v) => set("is_enabled", v)}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable parts ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
    >
      <h3 className="text-sm font-medium mb-4" style={{ color: "var(--a-text-2)" }}>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
          color: "var(--a-text-body)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--a-accent-btn)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--a-border)";
        }}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y transition-colors"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
          color: "var(--a-text-body)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--a-accent-btn)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--a-border)";
        }}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors cursor-pointer"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
          color: "var(--a-text-body)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--a-accent-btn)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--a-border)";
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-purple-500"
      />
      <span className="text-sm" style={{ color: "var(--a-text-2)" }}>
        {label}
      </span>
    </label>
  );
}
