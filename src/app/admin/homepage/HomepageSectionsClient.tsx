"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Settings, ExternalLink, Trash2 } from "lucide-react";

/* ─── Types ─── */
interface Section {
  id: string;
  code: string;
  title: string;
  section_type: string;
  sort_order: number;
  is_enabled: boolean;
  config: Record<string, unknown>;
  devices?: string[];
  created_at?: string;
  updated_at?: string;
}

/* ─── Section type → badge colour ─── */
const typeBadgeColors: Record<string, { bg: string; text: string }> = {
  banner_slot:      { bg: "#7c3aed20", text: "#a78bfa" },
  product_showcase: { bg: "#3b82f620", text: "#60a5fa" },
  deal:             { bg: "#ef444420", text: "#f87171" },
  categories:       { bg: "#22c55e20", text: "#4ade80" },
  features:         { bg: "#f59e0b20", text: "#fbbf24" },
  cta:              { bg: "#6366f120", text: "#818cf8" },
  help:             { bg: "#6b728020", text: "#9ca3af" },
  top_bar:          { bg: "#14b8a620", text: "#2dd4bf" },
};

/* ─── Section code → settings link ─── */
const sectionLink: Record<string, string | null> = {
  hero_slider:      "/admin/banners?type=hero_slider",
  promo_strip:      "/admin/banners?type=promo_strip",
  showcase_hits:    "/admin/homepage/showcases",
  showcase_new:     "/admin/homepage/showcases",
  showcase_sale:    "/admin/homepage/showcases",
  deal_of_day:      "/admin/homepage/deal",
  quick_categories: "/admin/homepage/quick-categories",
  features:         "/admin/homepage/features",
  b2b_cta:          "/admin/homepage/content-blocks/b2b_cta",
  top_bar:          "/admin/homepage/top-bar",
  help_contacts:    null,
};

/* Resolve settings link — for showcase sections, try to build direct link */
function getSectionLink(section: Section): string | null {
  if (sectionLink[section.code] !== undefined) return sectionLink[section.code];
  if (section.section_type === "product_showcase") return "/admin/homepage/showcases";
  return null;
}

/* Resolve settings hint — for showcase sections */
function getSectionLinkHint(section: Section): string | undefined {
  if (SECTION_LINK_HINT[section.code]) return SECTION_LINK_HINT[section.code];
  if (section.section_type === "product_showcase") return "(Вітрини)";
  return undefined;
}

/* ─── Static descriptions for team (not stored in DB) ─── */
const SECTION_DESCRIPTIONS: Record<string, string> = {
  top_bar: "Сервісна панель над шапкою: посилання на акції, доставку, контакти, телефон і графік роботи. Видно тільки на десктопі.",
  hero_slider: "Головний банер-слайдер. Керується через Контент → Банери (тип hero_slider). Розмір: 1300×400 px (десктоп), 640×640 px (мобайл).",
  promo_strip: "Тонка промо-стрічка під банером. Керується через Контент → Банери (тип promo_strip). Розмір: 1920×80 px.",
  quick_categories: "8-12 кнопок швидких категорій під банером. Налаштуйте які категорії показувати і в якому порядку.",
  deal_of_day: "Блок «Акція дня» з таймером зворотного відліку. Після закінчення таймера блок автоматично ховається.",
  showcase_hits: "Вітрина «Хіти продажів» — товари відсортовані за популярністю. Можна змінити правило або вибрати товари вручну.",
  showcase_new: "Вітрина «Новинки» — нещодавно додані товари з позначкою NEW.",
  showcase_sale: "Вітрина «Розпродаж» — товари зі знижкою (де є стара ціна).",
  features: "Блок «Сервіс і довіра» — 4 іконки з перевагами (доставка, оптові ціни, оригінал, підтримка).",
  b2b_cta: "Промо-блок для оптових клієнтів з кнопкою реєстрації. Текст і теги редагуються.",
  help_contacts: "Блок з контактами і кнопками месенджерів внизу сторінки. Поки що в розробці.",
};

/* ─── Button hint by code ─── */
const SECTION_LINK_HINT: Record<string, string> = {
  hero_slider: "(Банери)",
  promo_strip: "(Банери)",
  showcase_hits: "(Вітрини)",
  showcase_new: "(Вітрини)",
  showcase_sale: "(Вітрини)",
  quick_categories: "(Категорії)",
  deal_of_day: "(Акція дня)",
  features: "(Сервіс)",
  b2b_cta: "(Контент)",
  top_bar: "(Top Bar)",
};

/* ─── Showcase type for modal ─── */
interface Showcase {
  id: string;
  code: string;
  title_uk: string;
  is_enabled: boolean;
}

/* ─── Component ─── */
export function HomepageSectionsClient({
  initialSections,
  showcases = [],
}: {
  initialSections: Section[];
  showcases?: Showcase[];
}) {
  const [sections, setSections] = useState<Section[]>(
    () => [...initialSections].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShowcaseCode, setNewShowcaseCode] = useState("");
  const [adding, setAdding] = useState(false);

  /* Persist changes to API */
  const save = useCallback(async (updated: Section[]) => {
    setSaving(true);
    try {
      const payload = updated.map((s) => ({
        id: s.id,
        sort_order: s.sort_order,
        is_enabled: s.is_enabled,
      }));
      const res = await fetch("/api/admin/homepage/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save failed");
      setToast("Збережено");
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast("Помилка збереження");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  }, []);

  /* Toggle enabled */
  const toggleEnabled = (id: string) => {
    setSections((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, is_enabled: !s.is_enabled } : s
      );
      save(next);
      return next;
    });
  };

  /* Move section up / down */
  const move = (index: number, direction: "up" | "down") => {
    setSections((prev) => {
      const next = [...prev];
      const swapIdx = direction === "up" ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;

      // Swap sort_order values
      const tmpOrder = next[index].sort_order;
      next[index] = { ...next[index], sort_order: next[swapIdx].sort_order };
      next[swapIdx] = { ...next[swapIdx], sort_order: tmpOrder };

      // Swap positions in array
      [next[index], next[swapIdx]] = [next[swapIdx], next[index]];

      save(next);
      return next;
    });
  };

  /* Add section */
  const addSection = async () => {
    if (!newShowcaseCode) return;
    setAdding(true);
    try {
      const showcase = showcases.find(s => s.code === newShowcaseCode);
      const code = `showcase_${newShowcaseCode}`;

      if (sections.find(s => s.code === code)) {
        setToast("Ця вітрина вже додана");
        setTimeout(() => setToast(null), 3000);
        setAdding(false);
        return;
      }

      const res = await fetch("/api/admin/homepage/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title: showcase?.title_uk || newShowcaseCode,
          section_type: "product_showcase",
          is_enabled: true,
          config: { showcase_code: newShowcaseCode },
        }),
      });

      if (!res.ok) throw new Error("create failed");
      const data = await res.json();

      if (data.ok && data.section) {
        setSections(prev => [...prev, data.section].sort((a, b) => a.sort_order - b.sort_order));
        setShowAddModal(false);
        setNewShowcaseCode("");
        setToast("Секцію додано");
        setTimeout(() => setToast(null), 2000);
      }
    } catch {
      setToast("Помилка створення");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setAdding(false);
    }
  };

  /* Delete section */
  const deleteSection = async (id: string, code: string) => {
    if (!confirm(`Видалити секцію "${code}"?`)) return;
    try {
      const res = await fetch("/api/admin/homepage/sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete failed");
      setSections(prev => prev.filter(s => s.id !== id));
      setToast("Секцію видалено");
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast("Помилка видалення");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const badge = (type: string) => {
    const c = typeBadgeColors[type] ?? { bg: "#6b728020", text: "#9ca3af" };
    return (
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ background: c.bg, color: c.text }}
      >
        {type}
      </span>
    );
  };

  return (
    <div className="relative">
      {/* Add section button */}
      <div className="flex items-center justify-between mb-4">
        <div />
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--a-accent-btn)" }}
        >
          + Додати секцію
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all animate-fade-in"
          style={{
            background: toast === "Збережено" ? "#22c55e" : "#ef4444",
            color: "#fff",
          }}
        >
          {toast}
        </div>
      )}

      <div className="space-y-2">
      {sections.map((section, idx) => {
        const link = getSectionLink(section);
        return (
          <div
            key={section.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
            style={{
              background: "var(--a-bg-card)",
              border: "1px solid var(--a-border)",
              opacity: section.is_enabled ? 1 : 0.55,
            }}
          >
            {/* Toggle */}
            <button
              onClick={() => toggleEnabled(section.id)}
              disabled={saving}
              className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors cursor-pointer"
              style={{
                background: section.is_enabled ? "var(--a-accent-btn)" : "var(--a-border)",
              }}
              title={section.is_enabled ? "Вимкнути" : "Увімкнути"}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{
                  transform: section.is_enabled ? "translateX(16px)" : "translateX(0)",
                }}
              />
            </button>

            {/* Title + badge + description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--a-text)" }}
                >
                  {section.title}
                </span>
                {badge(section.section_type)}
              </div>
              <span className="text-[11px]" style={{ color: "var(--a-text-3)" }}>
                {section.code}
              </span>
              {SECTION_DESCRIPTIONS[section.code] && (
                <p
                  className="text-[11px] mt-0.5 leading-snug"
                  style={{ color: "var(--a-text-4)" }}
                >
                  {SECTION_DESCRIPTIONS[section.code]}
                </p>
              )}
            </div>

            {/* Arrow buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => move(idx, "up")}
                disabled={idx === 0 || saving}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
                style={{ color: "var(--a-accent-btn)" }}
                onMouseEnter={(e) => idx !== 0 && (e.currentTarget.style.background = "var(--a-bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Вгору"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => move(idx, "down")}
                disabled={idx === sections.length - 1 || saving}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
                style={{ color: "var(--a-accent-btn)" }}
                onMouseEnter={(e) =>
                  idx !== sections.length - 1 &&
                  (e.currentTarget.style.background = "var(--a-bg-hover)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Вниз"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>

            {/* Delete button */}
            <button
              onClick={() => deleteSection(section.id, section.code)}
              className="p-1.5 rounded-lg hover:opacity-80 transition-opacity flex-shrink-0"
              style={{ color: "#f87171" }}
              title="Видалити секцію"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Settings link */}
            {link !== null && link !== undefined ? (
              <Link
                href={link}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                style={{
                  color: "var(--a-accent-btn)",
                  border: "1px solid var(--a-border)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--a-bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Settings className="w-3.5 h-3.5" />
                Налаштувати
                {getSectionLinkHint(section) && (
                  <span className="opacity-50 font-normal">{getSectionLinkHint(section)}</span>
                )}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </Link>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                style={{
                  color: "var(--a-text-5)",
                  border: "1px solid var(--a-border)",
                  opacity: 0.5,
                }}
              >
                <Settings className="w-3.5 h-3.5" />
                скоро
              </span>
            )}
          </div>
        );
      })}

      {sections.length === 0 && (
        <div
          className="text-center py-12 rounded-xl"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
            Секції не знайдено. Перевірте таблицю homepage_sections.
          </p>
        </div>
      )}
      </div>

      {/* Add Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--a-text)" }}>
              Додати секцію на головну
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
                Вітрина товарів
              </label>
              <select
                value={newShowcaseCode}
                onChange={(e) => setNewShowcaseCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--a-bg-input, var(--a-bg-card))",
                  border: "1px solid var(--a-border)",
                  color: "var(--a-text-body)",
                }}
              >
                <option value="">— Оберіть вітрину —</option>
                {showcases
                  .filter(sc => !sections.find(s => s.config?.showcase_code === sc.code))
                  .map((sc) => (
                    <option key={sc.code} value={sc.code}>
                      {sc.title_uk} {!sc.is_enabled ? "(вимкнено)" : ""}
                    </option>
                  ))}
              </select>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--a-text-5)" }}>
                Спочатку створіть вітрину в{" "}
                <a href="/admin/homepage/showcases/new" className="underline" style={{ color: "var(--a-accent-btn)" }}>
                  Вітрини товарів
                </a>
                , потім додайте її сюди.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowAddModal(false); setNewShowcaseCode(""); }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}
              >
                Скасувати
              </button>
              <button
                onClick={addSection}
                disabled={!newShowcaseCode || adding}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--a-accent-btn)" }}
              >
                {adding ? "Додаю..." : "Додати"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
