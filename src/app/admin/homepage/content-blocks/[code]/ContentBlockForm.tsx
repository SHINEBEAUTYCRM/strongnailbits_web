"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, X, Plus } from "lucide-react";
import Link from "next/link";

/* ─── Types ─── */
interface ContentBlock {
  id: string;
  code: string;
  title_uk: string | null;
  title_ru: string | null;
  subtitle_uk: string | null;
  subtitle_ru: string | null;
  body_uk: string | null;
  body_ru: string | null;
  button_text_uk: string | null;
  button_text_ru: string | null;
  button_url: string | null;
  tags: string[] | null;
  bg_color: string | null;
  text_color: string | null;
  image_url: string | null;
  is_enabled: boolean;
}

export function ContentBlockForm({ initial }: { initial: ContentBlock }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title_uk: initial.title_uk || "",
    title_ru: initial.title_ru || "",
    subtitle_uk: initial.subtitle_uk || "",
    subtitle_ru: initial.subtitle_ru || "",
    body_uk: initial.body_uk || "",
    body_ru: initial.body_ru || "",
    button_text_uk: initial.button_text_uk || "",
    button_text_ru: initial.button_text_ru || "",
    button_url: initial.button_url || "",
    tags: (initial.tags as string[]) || [],
    bg_color: initial.bg_color || "#ffffff",
    text_color: initial.text_color || "#000000",
    image_url: initial.image_url || "",
    is_enabled: initial.is_enabled ?? true,
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (key: string, val: string | boolean | string[]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || form.tags.includes(tag)) return;
    set("tags", [...form.tags, tag]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    set("tags", form.tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/homepage/content-blocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: initial.code, ...form }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Помилка збереження");
        setSaving(false);
        return;
      }
      setSuccess("Збережено");
      setTimeout(() => setSuccess(""), 3000);
      router.refresh();
    } catch {
      setError("Network error");
    }
    setSaving(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/homepage"
            className="p-2 rounded-lg"
            style={{ color: "var(--a-text-3)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>
              Блок: {initial.code}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>
              Контент-блок · зміни зберігаються вручну
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--a-accent-btn)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Зберегти
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
      {success && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm"
          style={{ color: "#4ade80", background: "#052e16", border: "1px solid #166534" }}
        >
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Тексти */}
          <Section title="Тексти">
            <Field label="Title (UK)" value={form.title_uk} onChange={(v) => set("title_uk", v)} />
            <Field label="Title (RU)" value={form.title_ru} onChange={(v) => set("title_ru", v)} />
            <Field label="Subtitle (UK)" value={form.subtitle_uk} onChange={(v) => set("subtitle_uk", v)} />
            <Field label="Subtitle (RU)" value={form.subtitle_ru} onChange={(v) => set("subtitle_ru", v)} />
          </Section>

          {/* Контент */}
          <Section title="Контент">
            <TextArea label="Body (UK)" value={form.body_uk} onChange={(v) => set("body_uk", v)} rows={5} />
            <TextArea label="Body (RU)" value={form.body_ru} onChange={(v) => set("body_ru", v)} rows={5} />
          </Section>

          {/* Кнопка */}
          <Section title="Кнопка">
            <Field label="Button Text (UK)" value={form.button_text_uk} onChange={(v) => set("button_text_uk", v)} />
            <Field label="Button Text (RU)" value={form.button_text_ru} onChange={(v) => set("button_text_ru", v)} />
            <Field label="Button URL" value={form.button_url} onChange={(v) => set("button_url", v)} placeholder="https://" />
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Теги / Перки */}
          <Section title="Теги / Перки">
            <div className="flex flex-wrap gap-2 mb-3">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: "var(--a-border)", color: "var(--a-text-2)" }}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:opacity-70"
                    style={{ color: "var(--a-text-4)" }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {form.tags.length === 0 && (
                <span className="text-xs" style={{ color: "var(--a-text-5)" }}>
                  Немає тегів
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Новий тег..."
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }}
              />
              <button
                onClick={addTag}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--a-border)", color: "var(--a-text-2)" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </Section>

          {/* Оформлення */}
          <Section title="Оформлення">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.bg_color}
                  onChange={(e) => set("bg_color", e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                />
                <span className="text-xs font-mono" style={{ color: "var(--a-text-4)" }}>
                  {form.bg_color}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
                Text Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.text_color}
                  onChange={(e) => set("text_color", e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                />
                <span className="text-xs font-mono" style={{ color: "var(--a-text-4)" }}>
                  {form.text_color}
                </span>
              </div>
            </div>
            <Field label="Image URL" value={form.image_url} onChange={(v) => set("image_url", v)} placeholder="https://..." />
          </Section>

          {/* Статус */}
          <Section title="Статус">
            <label className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={form.is_enabled}
                onChange={(e) => set("is_enabled", e.target.checked)}
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className="text-sm" style={{ color: "var(--a-text-2)" }}>Увімкнено</span>
            </label>
            <p className="text-[11px] mt-1" style={{ color: "var(--a-text-5)" }}>
              Вимкнений блок не відображається на сайті
            </p>
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

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
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
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
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
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--a-accent-btn)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; }}
      />
    </div>
  );
}
