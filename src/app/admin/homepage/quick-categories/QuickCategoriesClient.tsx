"use client";

import { useState, useCallback } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, Eye, EyeOff } from "lucide-react";

/* ─── Types ─── */
interface Category {
  id: string;
  name_uk: string;
}

interface QuickCategory {
  id: string;
  category_id: string | null;
  title_override_uk: string | null;
  title_override_ru: string | null;
  image_override: string | null;
  sort_order: number;
  is_enabled: boolean;
  categories: {
    id: string;
    name_uk: string;
    name_ru: string | null;
    slug: string;
    image_url: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
}

/* ─── Component ─── */
export function QuickCategoriesClient({
  initialItems,
  allCategories,
}: {
  initialItems: QuickCategory[];
  allCategories: Category[];
}) {
  const [items, setItems] = useState<QuickCategory[]>(
    () => [...initialItems].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState("");

  const showToast = (msg: string, duration = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  };

  /* ─── Fetch fresh list ─── */
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/homepage/quick-categories");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems([...data].sort((a: QuickCategory, b: QuickCategory) => a.sort_order - b.sort_order));
    } catch {
      showToast("Помилка завантаження");
    }
  }, []);

  /* ─── Add category ─── */
  const handleAdd = async () => {
    if (!selectedCatId) return;
    // Check if already added
    if (items.some((it) => it.category_id === selectedCatId)) {
      showToast("Ця категорія вже додана");
      return;
    }
    setSaving(true);
    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;
      const res = await fetch("/api/admin/homepage/quick-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: selectedCatId,
          sort_order: maxOrder + 1,
          is_enabled: true,
        }),
      });
      if (!res.ok) throw new Error();
      showToast("Категорію додано");
      setSelectedCatId("");
      await refresh();
    } catch {
      showToast("Помилка додавання");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Toggle enabled ─── */
  const toggleEnabled = async (item: QuickCategory) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage/quick-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_enabled: !item.is_enabled }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_enabled: !i.is_enabled } : i))
      );
      showToast(item.is_enabled ? "Вимкнено" : "Увімкнено");
    } catch {
      showToast("Помилка зміни");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async (id: string) => {
    if (!confirm("Видалити цю категорію зі списку?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage/quick-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      showToast("Видалено");
      await refresh();
    } catch {
      showToast("Помилка видалення");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Reorder ─── */
  const move = async (index: number, direction: "up" | "down") => {
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const next = [...items];
    const tmpOrder = next[index].sort_order;
    next[index] = { ...next[index], sort_order: next[swapIdx].sort_order };
    next[swapIdx] = { ...next[swapIdx], sort_order: tmpOrder };
    [next[index], next[swapIdx]] = [next[swapIdx], next[index]];

    setItems(next);

    setSaving(true);
    try {
      const payload = next.map((item, idx) => ({
        id: item.id,
        sort_order: idx,
      }));
      const res = await fetch("/api/admin/homepage/quick-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      showToast("Порядок збережено");
    } catch {
      showToast("Помилка збереження порядку");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  /* ─── Available categories not yet added ─── */
  const usedIds = new Set(items.map((i) => i.category_id));
  const available = allCategories.filter((c) => !usedIds.has(c.id));

  return (
    <div className="space-y-4 relative">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
          style={{
            background: toast.includes("Помилка") ? "#ef4444" : "#22c55e",
            color: "#fff",
          }}
        >
          {toast}
        </div>
      )}

      {/* Add Category */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
        }}
      >
        <label className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--a-text-3)" }}>
          Додати категорію:
        </label>
        <select
          value={selectedCatId}
          onChange={(e) => setSelectedCatId(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "var(--a-bg-hover)",
            border: "1px solid var(--a-border)",
            color: "var(--a-text)",
          }}
        >
          <option value="">Оберіть категорію...</option>
          {available.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name_uk}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!selectedCatId || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default"
          style={{ background: "var(--a-accent-btn)" }}
        >
          <Plus className="w-4 h-4" />
          Додати
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
              Швидких категорій ще немає. Додайте першу!
            </p>
          </div>
        ) : (
          items.map((item, idx) => {
            const catName = item.title_override_uk || item.categories?.name_uk || "—";
            const catImage = item.image_override || item.categories?.image_url;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--a-bg-card)",
                  border: "1px solid var(--a-border)",
                  opacity: item.is_enabled ? 1 : 0.55,
                }}
              >
                {/* Image thumbnail */}
                {catImage ? (
                  <img
                    src={catImage}
                    alt={catName}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    style={{ border: "1px solid var(--a-border)" }}
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--a-bg-hover)", border: "1px solid var(--a-border)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--a-text-5)" }}>—</span>
                  </div>
                )}

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm font-medium truncate block"
                    style={{ color: "var(--a-text)" }}
                  >
                    {catName}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--a-text-5)" }}>
                    Порядок: {item.sort_order}
                    {item.categories?.slug ? ` · /${item.categories.slug}` : ""}
                  </span>
                </div>

                {/* Arrow buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => move(idx, "up")}
                    disabled={idx === 0 || saving}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
                    style={{ color: "var(--a-accent-btn)" }}
                    onMouseEnter={(e) =>
                      idx !== 0 && (e.currentTarget.style.background = "var(--a-bg-hover)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    title="Вгору"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => move(idx, "down")}
                    disabled={idx === items.length - 1 || saving}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
                    style={{ color: "var(--a-accent-btn)" }}
                    onMouseEnter={(e) =>
                      idx !== items.length - 1 &&
                      (e.currentTarget.style.background = "var(--a-bg-hover)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    title="Вниз"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Toggle visibility */}
                <button
                  onClick={() => toggleEnabled(item)}
                  disabled={saving}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  style={{ color: item.is_enabled ? "#4ade80" : "var(--a-text-5)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--a-bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  title={item.is_enabled ? "Вимкнути" : "Увімкнути"}
                >
                  {item.is_enabled ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(item.id)}
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
            );
          })
        )}
      </div>
    </div>
  );
}
