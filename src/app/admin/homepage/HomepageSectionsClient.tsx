"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Settings, ExternalLink } from "lucide-react";

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
  hero_slider:      "/admin/banners",
  promo_strip:      "/admin/banners",
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

/* ─── Component ─── */
export function HomepageSectionsClient({ initialSections }: { initialSections: Section[] }) {
  const [sections, setSections] = useState<Section[]>(
    () => [...initialSections].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
    <div className="space-y-2 relative">
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

      {sections.map((section, idx) => {
        const link = sectionLink[section.code];
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

            {/* Title + badge */}
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
  );
}
