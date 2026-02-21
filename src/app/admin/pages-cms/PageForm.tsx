"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, Trash2 } from "lucide-react";

function clientSlugify(text: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye",
    ж: "zh", з: "z", и: "y", і: "i", ї: "yi", й: "y", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
    ю: "yu", я: "ya", ё: "yo", ы: "y", э: "e", ъ: "",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? map[c.toLowerCase()] ?? c)
    .join("")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

interface PageData {
  id?: string;
  title_uk: string;
  title_ru: string;
  slug: string;
  content_uk: string;
  content_ru: string;
  meta_title_uk: string;
  meta_title_ru: string;
  meta_description_uk: string;
  meta_description_ru: string;
  status: string;
  template: string;
  position: number;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface PageFormProps {
  initial?: Partial<PageData>;
  mode: "new" | "edit";
}

const EMPTY: PageData = {
  title_uk: "",
  title_ru: "",
  slug: "",
  content_uk: "",
  content_ru: "",
  meta_title_uk: "",
  meta_title_ru: "",
  meta_description_uk: "",
  meta_description_ru: "",
  status: "draft",
  template: "default",
  position: 0,
};

export default function PageForm({ initial, mode }: PageFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<PageData>({ ...EMPTY, ...initial });
  const [slugManual, setSlugManual] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!slugManual && form.title_uk) {
      setForm((prev) => ({ ...prev, slug: clientSlugify(prev.title_uk) }));
    }
  }, [form.title_uk, slugManual]);

  function set(key: keyof PageData, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSave() {
    if (!form.title_uk.trim()) {
      setError("Назва (UK) обов'язкова");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const url =
        mode === "new"
          ? "/api/admin/pages-cms"
          : `/api/admin/pages-cms/${initial?.id}`;
      const method = mode === "new" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Помилка збереження");
        return;
      }

      if (mode === "new" && json.page?.id) {
        router.push(`/admin/pages-cms/${json.page.id}`);
      } else {
        setSuccess("Збережено");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError("Помилка з'єднання");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Видалити цю сторінку?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/pages-cms/${initial.id}`, { method: "DELETE" });
      router.push("/admin/pages-cms");
    } catch {
      setError("Не вдалось видалити");
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(d?: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString("uk-UA");
  }

  const inputClass =
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    borderColor: "var(--a-border)",
    background: "var(--a-card)",
    color: "var(--a-text)",
  };

  return (
    <div className="flex gap-6">
      {/* Left column — 65% */}
      <div className="flex-[65] space-y-5">
        {/* Title UK */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Назва (UK) *
          </label>
          <input
            value={form.title_uk}
            onChange={(e) => set("title_uk", e.target.value)}
            className={inputClass + " text-base font-semibold"}
            style={inputStyle}
            placeholder="Доставка та оплата"
          />
        </div>

        {/* Title RU */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Назва (RU)
          </label>
          <input
            value={form.title_ru}
            onChange={(e) => set("title_ru", e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Доставка и оплата"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Slug
          </label>
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugManual(true);
              set("slug", e.target.value);
            }}
            className={inputClass}
            style={inputStyle}
            placeholder="dostavka-ta-oplata"
          />
        </div>

        {/* Content UK */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Контент (UK)
          </label>
          <textarea
            value={form.content_uk}
            onChange={(e) => set("content_uk", e.target.value)}
            className={inputClass + " min-h-[400px] resize-y font-mono text-xs leading-relaxed"}
            style={inputStyle}
            placeholder="HTML або Markdown контент..."
          />
        </div>

        {/* Content RU */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Контент (RU)
          </label>
          <textarea
            value={form.content_ru}
            onChange={(e) => set("content_ru", e.target.value)}
            className={inputClass + " min-h-[300px] resize-y font-mono text-xs leading-relaxed"}
            style={inputStyle}
            placeholder="HTML или Markdown контент..."
          />
        </div>
      </div>

      {/* Right column — 35% */}
      <div className="flex-[35] space-y-5">
        {/* Status */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Статус
          </label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Template */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Шаблон
          </label>
          <select
            value={form.template}
            onChange={(e) => set("template", e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="default">Default</option>
            <option value="landing">Landing</option>
            <option value="full-width">Full Width</option>
          </select>
        </div>

        {/* Position */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Позиція
          </label>
          <input
            type="number"
            value={form.position}
            onChange={(e) => set("position", parseInt(e.target.value) || 0)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Meta Title UK */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Meta Title (UK)
          </label>
          <input
            value={form.meta_title_uk}
            onChange={(e) => set("meta_title_uk", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Meta Title RU */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Meta Title (RU)
          </label>
          <input
            value={form.meta_title_ru}
            onChange={(e) => set("meta_title_ru", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Meta Description UK */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Meta Description (UK)
          </label>
          <textarea
            value={form.meta_description_uk}
            onChange={(e) => set("meta_description_uk", e.target.value)}
            rows={3}
            className={inputClass + " resize-y"}
            style={inputStyle}
          />
        </div>

        {/* Meta Description RU */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
            Meta Description (RU)
          </label>
          <textarea
            value={form.meta_description_ru}
            onChange={(e) => set("meta_description_ru", e.target.value)}
            rows={3}
            className={inputClass + " resize-y"}
            style={inputStyle}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
          style={{ backgroundColor: "var(--a-accent)" }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {mode === "new" ? "Створити" : "Зберегти"}
        </button>

        {/* Preview */}
        {form.slug && (
          <a
            href={`/pages/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: "var(--a-border)",
              color: "var(--a-text-secondary)",
            }}
          >
            <ExternalLink size={14} />
            Переглянути
          </a>
        )}

        {/* Delete */}
        {mode === "edit" && initial?.id && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            style={{ borderColor: "#ef4444", color: "#ef4444" }}
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Видалити
          </button>
        )}

        {/* Dates */}
        {mode === "edit" && (
          <div className="space-y-1 text-xs" style={{ color: "var(--a-text-secondary)" }}>
            <div>Створено: {formatDate(initial?.created_at)}</div>
            <div>Оновлено: {formatDate(initial?.updated_at)}</div>
            {initial?.published_at && (
              <div>Опубліковано: {formatDate(initial.published_at)}</div>
            )}
          </div>
        )}

        {/* Feedback */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-600">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
