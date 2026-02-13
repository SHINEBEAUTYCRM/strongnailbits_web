"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploadWithStudio } from "./image-studio/ImageUploadWithStudio";

interface ParentOption { cs_cart_id: number; name_uk: string; depth: number; }

interface CategoryData {
  id?: string;
  name_uk: string;
  name_ru: string;
  slug: string;
  description_uk: string;
  description_ru: string;
  image_url: string;
  position: string;
  status: string;
  parent_cs_cart_id: string;
}

const EMPTY: CategoryData = {
  name_uk: "", name_ru: "", slug: "", description_uk: "", description_ru: "",
  image_url: "", position: "0", status: "active", parent_cs_cart_id: "",
};

export function CategoryForm({
  initial,
  parents,
  productCount,
}: {
  initial?: CategoryData;
  parents: ParentOption[];
  productCount?: number;
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<CategoryData>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (key: keyof CategoryData, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name_uk) { setError("Назва обов'язкова"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: initial?.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Помилка збереження"); setSaving(false); return; }
      if (!isEdit && data.category?.id) {
        router.push(`/admin/categories/${data.category.id}`);
      } else {
        setSuccess("Збережено");
        setTimeout(() => setSuccess(""), 3000);
        router.refresh();
      }
    } catch { setError("Network error"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Видалити категорію? Цю дію не можна відмінити.")) return;
    setDeleting(true); setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial?.id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) { router.push("/admin/categories"); } else { setError(data.error || "Помилка видалення"); }
    } catch { setError("Network error"); }
    setDeleting(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/categories" className="p-2 rounded-lg" style={{ color: "var(--a-text-3)" }}><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>{isEdit ? "Редагувати категорію" : "Нова категорія"}</h1>
            {isEdit && productCount !== undefined && <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>{productCount} товарів у категорії</p>}
          </div>
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
        {/* Left — main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic */}
          <Section title="Основне">
            <Field label="Назва (UK) *" value={form.name_uk} onChange={(v) => set("name_uk", v)} />
            <Field label="Назва (RU)" value={form.name_ru} onChange={(v) => set("name_ru", v)} />
            <Field label="Slug" value={form.slug} onChange={(v) => set("slug", v)} placeholder="Авто-генерація з назви" />
          </Section>

          {/* Description */}
          <Section title="Опис">
            <TextArea label="Опис (UK)" value={form.description_uk} onChange={(v) => set("description_uk", v)} rows={6} />
            <TextArea label="Опис (RU)" value={form.description_ru} onChange={(v) => set("description_ru", v)} rows={4} />
          </Section>

          {/* Image */}
          <Section title="Зображення">
            <ImageUploadWithStudio
              value={form.image_url}
              onChange={(url) => set("image_url", url)}
              context="category"
              entityId={initial?.id || "new"}
              suggestedSize={{ width: 1200, height: 400 }}
              label="Зображення категорії"
            />
          </Section>
        </div>

        {/* Right — sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Section title="Статус">
            <Select label="Статус" value={form.status} onChange={(v) => set("status", v)} options={[{ v: "active", l: "Активна" }, { v: "disabled", l: "Вимкнена" }]} />
            <p className="text-[11px] mt-2" style={{ color: "var(--a-text-5)" }}>Вимкнена категорія не відображається на сайті та в каталозі</p>
          </Section>

          {/* Hierarchy */}
          <Section title="Ієрархія">
            <Select label="Батьківська категорія" value={form.parent_cs_cart_id} onChange={(v) => set("parent_cs_cart_id", v)}
              options={[{ v: "", l: "— Кореневий рівень —" }, ...parents.map((p) => ({ v: String(p.cs_cart_id), l: "—".repeat(p.depth) + " " + p.name_uk }))]} />
            <p className="text-[11px] mt-2" style={{ color: "var(--a-text-5)" }}>Визначає місце категорії в дереві навігації</p>
          </Section>

          {/* Sort */}
          <Section title="Сортування">
            <Field label="Позиція" value={form.position} onChange={(v) => set("position", v)} type="number" />
            <p className="text-[11px] mt-2" style={{ color: "var(--a-text-5)" }}>Менше число = вище в списку</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable parts ─── */
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
