"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  Trash2,
  ArrowLeft,
  Copy,
  Eye,
  Link as LinkIcon,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { ImageUploadWithStudio } from "../image-studio/ImageUploadWithStudio";
import { BannerTypeSelector } from "./BannerTypeSelector";
import { BannerStatusBadge } from "./BannerStatusBadge";
import type { Banner, BannerType } from "@/types/banners";
import { BANNER_SIZES, PLACEMENT_OPTIONS } from "@/types/banners";

/* ─── Types ─── */

interface BannerFormProps {
  initial?: Banner;
  categories: { id: string; name_uk: string }[];
}

interface FormData {
  title: string;
  heading: string;
  subheading: string;
  button_text: string;
  button_url: string;
  promo_code: string;
  discount_text: string;
  image_desktop: string;
  image_mobile: string;
  image_alt: string;
  type: BannerType;
  placement: string[];
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  sort_order: string;
  priority: string;
  bg_color: string;
  text_color: string;
  overlay_opacity: string;
}

const EMPTY: FormData = {
  title: "",
  heading: "",
  subheading: "",
  button_text: "",
  button_url: "",
  promo_code: "",
  discount_text: "",
  image_desktop: "",
  image_mobile: "",
  image_alt: "",
  type: "hero_slider",
  placement: [],
  starts_at: "",
  ends_at: "",
  is_active: true,
  sort_order: "0",
  priority: "1",
  bg_color: "#0e0e14",
  text_color: "#FFFFFF",
  overlay_opacity: "30",
};

function bannerToFormData(b: Banner): FormData {
  return {
    title: b.title ?? "",
    heading: b.heading ?? "",
    subheading: b.subheading ?? "",
    button_text: b.button_text ?? "",
    button_url: b.button_url ?? "",
    promo_code: b.promo_code ?? "",
    discount_text: b.discount_text ?? "",
    image_desktop: b.image_desktop ?? "",
    image_mobile: b.image_mobile ?? "",
    image_alt: b.image_alt ?? "",
    type: b.type,
    placement: b.placement ?? [],
    starts_at: b.starts_at ? b.starts_at.slice(0, 16) : "",
    ends_at: b.ends_at ? b.ends_at.slice(0, 16) : "",
    is_active: b.is_active,
    sort_order: String(b.sort_order),
    priority: String(b.priority),
    bg_color: b.bg_color ?? "#0e0e14",
    text_color: b.text_color ?? "#FFFFFF",
    overlay_opacity: String(b.overlay_opacity),
  };
}

/* ─── Main Component ─── */

export function BannerForm({ initial, categories }: BannerFormProps) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<FormData>(
    initial ? bannerToFormData(initial) : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  /* helpers */
  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const togglePlacement = (val: string) => {
    setForm((f) => ({
      ...f,
      placement: f.placement.includes(val)
        ? f.placement.filter((p) => p !== val)
        : [...f.placement, val],
    }));
  };

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    const q = catSearch.toLowerCase();
    return categories.filter((c) => c.name_uk.toLowerCase().includes(q));
  }, [categories, catSearch]);

  const copyPromoCode = async () => {
    if (!form.promo_code) return;
    try {
      await navigator.clipboard.writeText(form.promo_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const ctr =
    initial && initial.views_count > 0
      ? ((initial.clicks_count / initial.views_count) * 100).toFixed(2)
      : "0.00";

  /* ─── Save ─── */
  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Внутрішня назва обов'язкова");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      title: form.title,
      heading: form.heading || null,
      subheading: form.subheading || null,
      button_text: form.button_text || null,
      button_url: form.button_url || null,
      promo_code: form.promo_code || null,
      discount_text: form.discount_text || null,
      image_desktop: form.image_desktop || null,
      image_mobile: form.image_mobile || null,
      image_alt: form.image_alt || null,
      type: form.type,
      placement: form.placement,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      priority: Number(form.priority) || 1,
      bg_color: form.bg_color || null,
      text_color: form.text_color,
      overlay_opacity: Number(form.overlay_opacity) || 0,
    };

    try {
      const url = isEdit ? `/api/banners/${initial!.id}` : "/api/banners";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Помилка збереження");
        setSaving(false);
        return;
      }

      if (!isEdit && data.banner?.id) {
        router.push(`/admin/banners/${data.banner.id}`);
      } else {
        setSuccess("Збережено");
        setTimeout(() => setSuccess(""), 3000);
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  };

  /* ─── Delete ─── */
  const handleDelete = async () => {
    if (!confirm("Видалити банер? Цю дію не можна відмінити.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/banners/${initial!.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push("/admin/banners");
      } else {
        setError(data.error || "Помилка видалення");
      }
    } catch {
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
            href="/admin/banners"
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "#71717a" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <h1
              className="text-xl font-semibold"
              style={{ color: "#f4f4f5" }}
            >
              {isEdit ? "Редагувати банер" : "Новий банер"}
            </h1>
            {initial && <BannerStatusBadge banner={initial} />}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              style={{
                color: "#f87171",
                background: "#1c1017",
                border: "1px solid #7f1d1d",
              }}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Видалити
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ background: "#7c3aed" }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Зберегти
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm"
          style={{
            color: "#f87171",
            background: "#450a0a",
            border: "1px solid #7f1d1d",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm"
          style={{
            color: "#4ade80",
            background: "#052e16",
            border: "1px solid #166534",
          }}
        >
          {success}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══════════ LEFT COLUMN ═══════════ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Banner Type */}
          <Section title="Тип банера">
            <BannerTypeSelector
              value={form.type}
              onChange={(t) => set("type", t)}
            />
            <p
              className="text-[11px] mt-2"
              style={{
                color: "#52525b",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Рекомендований розмір: {BANNER_SIZES[form.type].width}×
              {BANNER_SIZES[form.type].height}px
            </p>
          </Section>

          {/* Images */}
          <Section title="Зображення">
            <div>
              <p
                className="text-xs font-medium mb-3"
                style={{ color: "#71717a" }}
              >
                Десктоп зображення
              </p>
              <ImageUploadWithStudio
                value={form.image_desktop}
                onChange={(url) => set("image_desktop", url)}
                context="banner"
                entityId={initial?.id || "new"}
                suggestedSize={{
                  width: BANNER_SIZES[form.type].width,
                  height: BANNER_SIZES[form.type].height,
                }}
              />
            </div>

            {form.type === "hero_slider" && (
              <div
                className="mt-4 pt-4"
                style={{ borderTop: "1px solid #1e1e2a" }}
              >
                <p
                  className="text-xs font-medium mb-3"
                  style={{ color: "#71717a" }}
                >
                  Мобільне зображення
                </p>
                <ImageUploadWithStudio
                  value={form.image_mobile}
                  onChange={(url) => set("image_mobile", url)}
                  context="banner"
                  entityId={initial?.id || "new-mobile"}
                  suggestedSize={{ width: 768, height: 600 }}
                />
              </div>
            )}

            <Field
              label="Alt-текст зображення"
              value={form.image_alt}
              onChange={(v) => set("image_alt", v)}
              placeholder="Опис зображення для SEO"
            />
          </Section>

          {/* Content */}
          <Section title="Контент банера">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#71717a" }}
              >
                Заголовок
              </label>
              <input
                type="text"
                value={form.heading}
                onChange={(e) => set("heading", e.target.value)}
                placeholder="Заголовок на банері"
                className="w-full px-3 py-3 rounded-lg text-lg font-semibold outline-none transition-colors"
                style={{
                  background: "#111116",
                  border: "1px solid #1e1e2a",
                  color: "#e4e4e7",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#7c3aed";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#1e1e2a";
                }}
              />
            </div>

            <TextArea
              label="Підзаголовок / текст акції"
              value={form.subheading}
              onChange={(v) => set("subheading", v)}
              placeholder="Текст акції / підзаголовок"
              rows={3}
            />

            <Field
              label="Текст знижки"
              value={form.discount_text}
              onChange={(v) => set("discount_text", v)}
              placeholder="-30%"
            />

            {/* Promo code with copy */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#71717a" }}
              >
                Промокод
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.promo_code}
                  onChange={(e) =>
                    set("promo_code", e.target.value.toUpperCase())
                  }
                  placeholder="SHINE30"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "#111116",
                    border: "1px solid #1e1e2a",
                    color: "#e4e4e7",
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "1px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#7c3aed";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#1e1e2a";
                  }}
                />
                <button
                  onClick={copyPromoCode}
                  className="px-3 py-2.5 rounded-lg transition-colors"
                  style={{
                    background: "#111116",
                    border: "1px solid #1e1e2a",
                    color: copied ? "#4ade80" : "#71717a",
                  }}
                  title="Копіювати"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Field
              label="Текст кнопки"
              value={form.button_text}
              onChange={(v) => set("button_text", v)}
              placeholder="Детальніше"
            />

            {/* Button URL with icon */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#71717a" }}
              >
                Посилання кнопки
              </label>
              <div className="relative">
                <LinkIcon
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#52525b" }}
                />
                <input
                  type="text"
                  value={form.button_url}
                  onChange={(e) => set("button_url", e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "#111116",
                    border: "1px solid #1e1e2a",
                    color: "#e4e4e7",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#7c3aed";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#1e1e2a";
                  }}
                />
              </div>
            </div>
          </Section>

          {/* Styling */}
          <Section title="Стилізація">
            {/* Background color */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#71717a" }}
              >
                Фоновий колір
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.bg_color}
                  onChange={(e) => set("bg_color", e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                  style={{
                    background: "#111116",
                    border: "1px solid #1e1e2a",
                  }}
                />
                <input
                  type="text"
                  value={form.bg_color}
                  onChange={(e) => set("bg_color", e.target.value)}
                  className="w-28 px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "#111116",
                    border: "1px solid #1e1e2a",
                    color: "#e4e4e7",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#7c3aed";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#1e1e2a";
                  }}
                />
              </div>
            </div>

            {/* Text color */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#71717a" }}
              >
                Колір тексту
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => set("text_color", "#FFFFFF")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all"
                  style={{
                    background:
                      form.text_color === "#FFFFFF"
                        ? "rgba(124, 58, 237, 0.1)"
                        : "#111116",
                    border: `1px solid ${form.text_color === "#FFFFFF" ? "#7c3aed" : "#1e1e2a"}`,
                    color: "#e4e4e7",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full border"
                    style={{
                      background: "#FFFFFF",
                      borderColor: "#3f3f46",
                    }}
                  />
                  Білий
                </button>
                <button
                  onClick={() => set("text_color", "#18181b")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all"
                  style={{
                    background:
                      form.text_color === "#18181b"
                        ? "rgba(124, 58, 237, 0.1)"
                        : "#111116",
                    border: `1px solid ${form.text_color === "#18181b" ? "#7c3aed" : "#1e1e2a"}`,
                    color: "#e4e4e7",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full border"
                    style={{
                      background: "#18181b",
                      borderColor: "#3f3f46",
                    }}
                  />
                  Темний
                </button>
              </div>
            </div>

            {/* Overlay opacity */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#71717a" }}
              >
                Затемнення оверлею:{" "}
                <span
                  style={{
                    color: "#a1a1aa",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {form.overlay_opacity}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={form.overlay_opacity}
                onChange={(e) => set("overlay_opacity", e.target.value)}
                className="w-full accent-purple-600"
                style={{ accentColor: "#7c3aed" }}
              />
              <div
                className="flex justify-between text-[10px] mt-1"
                style={{ color: "#52525b" }}
              >
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </Section>
        </div>

        {/* ═══════════ RIGHT COLUMN ═══════════ */}
        <div className="space-y-6">
          {/* Publication */}
          <Section title="Публікація">
            {/* Active toggle */}
            <div
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: "#111116", border: "1px solid #1e1e2a" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "#e4e4e7" }}>
                  {form.is_active ? "Активний" : "Неактивний"}
                </p>
                <p className="text-[11px]" style={{ color: "#52525b" }}>
                  {form.is_active
                    ? "Банер відображається"
                    : "Банер приховано"}
                </p>
              </div>
              <button
                onClick={() => set("is_active", !form.is_active)}
                className="transition-colors"
                style={{ color: form.is_active ? "#7c3aed" : "#3f3f46" }}
              >
                {form.is_active ? (
                  <ToggleRight className="w-8 h-8" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>

            {/* Schedule */}
            <div>
              <label
                className="flex items-center gap-1.5 text-xs font-medium mb-1.5"
                style={{ color: "#71717a" }}
              >
                <Calendar className="w-3.5 h-3.5" />
                Початок показу
              </label>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => set("starts_at", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: "#111116",
                  border: "1px solid #1e1e2a",
                  color: "#e4e4e7",
                  colorScheme: "dark",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#7c3aed";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#1e1e2a";
                }}
              />
            </div>

            <div>
              <label
                className="flex items-center gap-1.5 text-xs font-medium mb-1.5"
                style={{ color: "#71717a" }}
              >
                <Calendar className="w-3.5 h-3.5" />
                Кінець показу
              </label>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => set("ends_at", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  background: "#111116",
                  border: "1px solid #1e1e2a",
                  color: "#e4e4e7",
                  colorScheme: "dark",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#7c3aed";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#1e1e2a";
                }}
              />
            </div>
          </Section>

          {/* Placement */}
          <Section title="Розташування">
            <div className="space-y-2">
              {PLACEMENT_OPTIONS.map((opt) => (
                <PlacementCheckbox
                  key={opt.value}
                  label={opt.label}
                  checked={form.placement.includes(opt.value)}
                  onChange={() => togglePlacement(opt.value)}
                />
              ))}
            </div>

            {/* Category placement */}
            <div
              className="mt-3 pt-3"
              style={{ borderTop: "1px solid #1e1e2a" }}
            >
              <p
                className="text-xs font-medium mb-2"
                style={{ color: "#71717a" }}
              >
                Категорії
              </p>
              <input
                type="text"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Пошук категорії..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors mb-2"
                style={{
                  background: "#111116",
                  border: "1px solid #1e1e2a",
                  color: "#e4e4e7",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#7c3aed";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#1e1e2a";
                }}
              />
              <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                {filteredCategories.length === 0 && (
                  <p
                    className="text-xs py-2 text-center"
                    style={{ color: "#3f3f46" }}
                  >
                    Категорії не знайдено
                  </p>
                )}
                {filteredCategories.map((cat) => (
                  <PlacementCheckbox
                    key={cat.id}
                    label={cat.name_uk}
                    checked={form.placement.includes(`category:${cat.id}`)}
                    onChange={() => togglePlacement(`category:${cat.id}`)}
                  />
                ))}
              </div>
            </div>
          </Section>

          {/* Ordering */}
          <Section title="Порядок">
            <Field
              label="Порядок сортування"
              value={form.sort_order}
              onChange={(v) => set("sort_order", v)}
              type="number"
              placeholder="0"
            />
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "#71717a" }}
              >
                Пріоритет
              </label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors cursor-pointer"
                style={{
                  background: "#111116",
                  border: "1px solid #1e1e2a",
                  color: "#e4e4e7",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#7c3aed";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#1e1e2a";
                }}
              >
                <option value="0">Низький</option>
                <option value="1">Звичайний</option>
                <option value="2">Високий</option>
                <option value="3">Критичний</option>
              </select>
            </div>
          </Section>

          {/* Analytics (only in edit mode) */}
          {initial && (
            <Section title="Аналітика">
              <div className="grid grid-cols-3 gap-3">
                <AnalyticCard
                  label="Перегляди"
                  value={initial.views_count.toLocaleString("uk-UA")}
                  icon={<Eye className="w-3.5 h-3.5" />}
                />
                <AnalyticCard
                  label="Кліки"
                  value={initial.clicks_count.toLocaleString("uk-UA")}
                  icon={<LinkIcon className="w-3.5 h-3.5" />}
                />
                <AnalyticCard
                  label="CTR"
                  value={`${ctr}%`}
                  icon={
                    <span
                      className="text-[10px] font-bold"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      %
                    </span>
                  }
                />
              </div>
            </Section>
          )}

          {/* Service info */}
          <Section title="Службове">
            <Field
              label="Внутрішня назва *"
              value={form.title}
              onChange={(v) => set("title", v)}
              placeholder="Назва для адмін-панелі"
            />

            {isEdit && initial && (
              <>
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "#71717a" }}
                  >
                    ID
                  </label>
                  <div
                    className="px-3 py-2.5 rounded-lg text-xs select-all"
                    style={{
                      background: "#111116",
                      border: "1px solid #1e1e2a",
                      color: "#52525b",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {initial.id}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block text-[10px] font-medium mb-1"
                      style={{ color: "#3f3f46" }}
                    >
                      Створено
                    </label>
                    <p
                      className="text-xs"
                      style={{
                        color: "#52525b",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {new Date(initial.created_at).toLocaleString("uk-UA", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <label
                      className="block text-[10px] font-medium mb-1"
                      style={{ color: "#3f3f46" }}
                    >
                      Оновлено
                    </label>
                    <p
                      className="text-xs"
                      style={{
                        color: "#52525b",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {new Date(initial.updated_at).toLocaleString("uk-UA", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable form parts ─── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}
    >
      <h3
        className="text-sm font-medium mb-4"
        style={{ color: "#a1a1aa" }}
      >
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
      <label
        className="block text-xs font-medium mb-1.5"
        style={{ color: "#71717a" }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
        style={{
          background: "#111116",
          border: "1px solid #1e1e2a",
          color: "#e4e4e7",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#7c3aed";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#1e1e2a";
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        className="block text-xs font-medium mb-1.5"
        style={{ color: "#71717a" }}
      >
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y transition-colors"
        style={{
          background: "#111116",
          border: "1px solid #1e1e2a",
          color: "#e4e4e7",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#7c3aed";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#1e1e2a";
        }}
      />
    </div>
  );
}

function PlacementCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className="flex items-center gap-2.5 cursor-pointer py-1 group"
      onClick={onChange}
    >
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0"
        style={{
          background: checked ? "#7c3aed" : "#111116",
          border: `1px solid ${checked ? "#7c3aed" : "#1e1e2a"}`,
        }}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="w-3 h-3">
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="text-sm" style={{ color: "#a1a1aa" }}>
        {label}
      </span>
    </label>
  );
}

function AnalyticCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{ background: "#111116", border: "1px solid #1e1e2a" }}
    >
      <div
        className="flex items-center justify-center mb-1.5"
        style={{ color: "#52525b" }}
      >
        {icon}
      </div>
      <p
        className="text-base font-semibold"
        style={{
          color: "#e4e4e7",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {value}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: "#52525b" }}>
        {label}
      </p>
    </div>
  );
}
