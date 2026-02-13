"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Trash2, ArrowLeft, Plus, X, ImageIcon, Camera } from "lucide-react";
import Link from "next/link";
import { ImageUpload } from "./ImageUpload";
import { ImageUploadWithStudio } from "./image-studio/ImageUploadWithStudio";

interface Category { id: string; name_uk: string; }
interface Brand { id: string; name: string; }

interface ProductData {
  id?: string;
  name_uk: string;
  name_ru: string;
  slug: string;
  sku: string;
  description_uk: string;
  description_ru: string;
  price: string;
  old_price: string;
  wholesale_price: string;
  cost_price: string;
  quantity: string;
  status: string;
  main_image_url: string;
  images: string[];
  weight: string;
  meta_title: string;
  meta_description: string;
  is_featured: boolean;
  is_new: boolean;
  position: string;
  category_id: string;
  brand_id: string;
}

const EMPTY: ProductData = {
  name_uk: "", name_ru: "", slug: "", sku: "", description_uk: "", description_ru: "",
  price: "", old_price: "", wholesale_price: "", cost_price: "", quantity: "0",
  status: "active", main_image_url: "", images: [], weight: "",
  meta_title: "", meta_description: "", is_featured: false, is_new: false,
  position: "0", category_id: "", brand_id: "",
};

export function ProductForm({
  initial,
  categories,
  brands,
}: {
  initial?: ProductData;
  categories: Category[];
  brands: Brand[];
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<ProductData>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const set = (key: keyof ProductData, val: string | boolean | string[]) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name_uk || !form.price) { setError("Назва та ціна обов'язкові"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: initial?.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Помилка збереження"); setSaving(false); return; }
      if (!isEdit && data.product?.id) {
        router.push(`/admin/products/${data.product.id}`);
      } else {
        setSuccess("Збережено");
        setTimeout(() => setSuccess(""), 3000);
        router.refresh();
      }
    } catch { setError("Network error"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Видалити товар? Цю дію не можна відмінити.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial?.id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) { router.push("/admin/products"); } else { setError(data.error || "Помилка видалення"); }
    } catch { setError("Network error"); }
    setDeleting(false);
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    set("images", [...form.images, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const removeImage = (idx: number) => {
    set("images", form.images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="p-2 rounded-lg" style={{ color: "var(--a-text-3)" }}><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>{isEdit ? "Редагувати товар" : "Новий товар"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isEdit && (
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ color: "#f87171", background: "#1c1017", border: "1px solid #7f1d1d" }}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Видалити
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--a-accent-btn)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Зберегти
          </button>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" }}>{error}</div>}
      {success && <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ color: "#4ade80", background: "#052e16", border: "1px solid #166534" }}>{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic */}
          <Section title="Основне">
            <Field label="Назва (UK) *" value={form.name_uk} onChange={(v) => set("name_uk", v)} />
            <Field label="Назва (RU)" value={form.name_ru} onChange={(v) => set("name_ru", v)} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Slug" value={form.slug} onChange={(v) => set("slug", v)} placeholder="Авто-генерація" />
              <Field label="SKU" value={form.sku} onChange={(v) => set("sku", v)} />
            </div>
          </Section>

          {/* Description */}
          <Section title="Опис">
            <TextArea label="Опис (UK)" value={form.description_uk} onChange={(v) => set("description_uk", v)} rows={6} />
            <TextArea label="Опис (RU)" value={form.description_ru} onChange={(v) => set("description_ru", v)} rows={4} />
          </Section>

          {/* Images */}
          <Section title="Зображення">
            <div>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--a-text-3)" }}>Головне зображення</p>
              <ImageUploadWithStudio
                value={form.main_image_url}
                onChange={(url) => set("main_image_url", url)}
                onBatchSave={(urls) => set("images", [...form.images, ...urls])}
                context="product"
                entityId={initial?.id || "new"}
                suggestedSize={{ width: 1000, height: 1000 }}
                label=""
              />
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--a-border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--a-text-3)" }}>Додаткові зображення</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.images.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover" style={{ background: "var(--a-bg-input)" }} />
                    <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#450a0a", color: "#f87171" }}><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <ImageUpload onUpload={(url) => set("images", [...form.images, url])} compact />
              </div>

              {/* Manual URL fallback */}
              <details className="mt-2">
                <summary className="text-[10px] cursor-pointer" style={{ color: "var(--a-text-5)" }}>
                  Або додати за URL...
                </summary>
                <div className="flex gap-2 mt-2">
                  <input type="text" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="URL зображення" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }} onKeyDown={(e) => e.key === "Enter" && addImage()} />
                  <button onClick={addImage} className="px-3 py-2 rounded-lg" style={{ background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}><Plus className="w-4 h-4" /></button>
                </div>
              </details>
            </div>
          </Section>

          {/* SEO */}
          <Section title="SEO">
            <Field label="Meta Title" value={form.meta_title} onChange={(v) => set("meta_title", v)} />
            <TextArea label="Meta Description" value={form.meta_description} onChange={(v) => set("meta_description", v)} rows={3} />
          </Section>
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Section title="Статус">
            <Select label="Статус" value={form.status} onChange={(v) => set("status", v)} options={[{ v: "active", l: "Активний" }, { v: "disabled", l: "Вимкнений" }, { v: "hidden", l: "Прихований" }]} />
            <div className="flex gap-4 mt-3">
              <Checkbox label="Хіт" checked={form.is_featured} onChange={(v) => set("is_featured", v)} />
              <Checkbox label="Новинка" checked={form.is_new} onChange={(v) => set("is_new", v)} />
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Ціни">
            <Field label="Ціна (₴) *" value={form.price} onChange={(v) => set("price", v)} type="number" />
            <Field label="Стара ціна (₴)" value={form.old_price} onChange={(v) => set("old_price", v)} type="number" />
            <Field label="Оптова ціна (₴)" value={form.wholesale_price} onChange={(v) => set("wholesale_price", v)} type="number" />
            <Field label="Собівартість (₴)" value={form.cost_price} onChange={(v) => set("cost_price", v)} type="number" />
          </Section>

          {/* Stock */}
          <Section title="Склад">
            <Field label="Кількість" value={form.quantity} onChange={(v) => set("quantity", v)} type="number" />
            <Field label="Вага (кг)" value={form.weight} onChange={(v) => set("weight", v)} type="number" />
            <Field label="Позиція сортування" value={form.position} onChange={(v) => set("position", v)} type="number" />
          </Section>

          {/* Relations */}
          <Section title="Категорія / Бренд">
            <Select label="Категорія" value={form.category_id} onChange={(v) => set("category_id", v)}
              options={[{ v: "", l: "— Без категорії —" }, ...categories.map((c) => ({ v: c.id, l: c.name_uk }))]} />
            <Select label="Бренд" value={form.brand_id} onChange={(v) => set("brand_id", v)}
              options={[{ v: "", l: "— Без бренду —" }, ...brands.map((b) => ({ v: b.id, l: b.name }))]} />
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable form parts ─── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
      <h3 className="text-sm font-medium mb-4" style={{ color: "var(--a-text-2)" }}>{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }} />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y transition-colors"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors cursor-pointer"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-1 group" onClick={() => onChange(!checked)}>
      <div className="w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0"
        style={{ background: checked ? "var(--a-accent-btn)" : "var(--a-bg-card)", border: `1px solid ${checked ? "var(--a-accent-btn)" : "var(--a-border)"}` }}>
        {checked && <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span className="text-sm" style={{ color: "var(--a-text-2)" }}>{label}</span>
    </label>
  );
}
