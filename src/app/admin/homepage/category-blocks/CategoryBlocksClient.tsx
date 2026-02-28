"use client";

import { useState, useCallback } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, Eye, EyeOff } from "lucide-react";

/* ─── Types ─── */
interface ParentCategory {
  id: string;
  name_uk: string;
  cs_cart_id: string | null;
}

interface CategoryBlock {
  id: string;
  category_id: string | null;
  title_override_uk: string | null;
  title_override_ru: string | null;
  subtitle_uk: string | null;
  subtitle_ru: string | null;
  children_limit: number;
  sort_order: number;
  is_enabled: boolean;
  show_on_web: boolean;
  show_on_app: boolean;
  categories: {
    id: string;
    name_uk: string;
    slug: string;
    image_url: string | null;
    cs_cart_id: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
}

/* ─── Component ─── */
export function CategoryBlocksClient({
  initialBlocks,
  parentCategories,
}: {
  initialBlocks: CategoryBlock[];
  parentCategories: ParentCategory[];
}) {
  const [items, setItems] = useState<CategoryBlock[]>(
    () => [...initialBlocks].sort((a, b) => a.sort_order - b.sort_order)
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
      const res = await fetch("/api/admin/homepage/category-blocks", {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems([...data].sort((a: CategoryBlock, b: CategoryBlock) => a.sort_order - b.sort_order));
    } catch {
      showToast("Помилка завантаження");
    }
  }, []);

  /* ─── Save single field on blur ─── */
  const saveField = async (id: string, field: string, value: unknown) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage/category-blocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
      );
    } catch {
      showToast("Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Add block ─── */
  const handleAdd = async () => {
    if (!selectedCatId) return;
    if (items.some((it) => it.category_id === selectedCatId)) {
      showToast("Цей блок вже додано");
      return;
    }
    setSaving(true);
    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;
      const res = await fetch("/api/admin/homepage/category-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category_id: selectedCatId,
          sort_order: maxOrder + 1,
          is_enabled: true,
          show_on_web: true,
          show_on_app: true,
          children_limit: 4,
        }),
      });
      if (!res.ok) throw new Error();
      showToast("Блок додано");
      setSelectedCatId("");
      await refresh();
    } catch {
      showToast("Помилка додавання");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Toggle enabled ─── */
  const toggleEnabled = async (item: CategoryBlock) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage/category-blocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
    if (!confirm("Видалити цей блок зі списку?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage/category-blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      const res = await fetch("/api/admin/homepage/category-blocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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

  /* ─── Available parent categories not yet added ─── */
  const usedIds = new Set(items.map((i) => i.category_id));
  const available = parentCategories.filter((c) => !usedIds.has(c.id));

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

      {/* Add Block */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
        }}
      >
        <label className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--a-text-3)" }}>
          Додати блок:
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
          <option value="">Оберіть батьківську категорію...</option>
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
      <div className="space-y-3">
        {items.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
              Блоків категорій ще немає. Додайте перший!
            </p>
          </div>
        ) : (
          items.map((item, idx) => {
            const catName = item.categories?.name_uk || "—";
            return (
              <div
                key={item.id}
                className="rounded-xl"
                style={{
                  background: "var(--a-bg-card)",
                  border: "1px solid var(--a-border)",
                  opacity: item.is_enabled ? 1 : 0.55,
                }}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Category image */}
                  {item.categories?.image_url ? (
                    <img
                      src={item.categories.image_url}
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

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block" style={{ color: "var(--a-text)" }}>
                      {catName}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--a-text-5)" }}>
                      Порядок: {item.sort_order}
                      {item.categories?.slug ? ` · /${item.categories.slug}` : ""}
                    </span>
                  </div>

                  {/* Children limit select */}
                  <select
                    value={item.children_limit}
                    onChange={(e) => saveField(item.id, "children_limit", Number(e.target.value))}
                    className="px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{
                      background: "var(--a-bg-hover)",
                      border: "1px solid var(--a-border)",
                      color: "var(--a-text-3)",
                    }}
                    title="Кількість дочірніх категорій"
                  >
                    <option value={4}>4 дочірніх</option>
                    <option value={6}>6 дочірніх</option>
                  </select>

                  {/* Web toggle */}
                  <button
                    onClick={() => saveField(item.id, "show_on_web", !item.show_on_web)}
                    disabled={saving}
                    className="px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
                    style={{
                      background: item.show_on_web ? "#3b82f620" : "var(--a-bg-hover)",
                      color: item.show_on_web ? "#60a5fa" : "var(--a-text-5)",
                      border: `1px solid ${item.show_on_web ? "#3b82f640" : "var(--a-border)"}`,
                    }}
                    title="Показувати на сайті"
                  >
                    Веб
                  </button>

                  {/* App toggle */}
                  <button
                    onClick={() => saveField(item.id, "show_on_app", !item.show_on_app)}
                    disabled={saving}
                    className="px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
                    style={{
                      background: item.show_on_app ? "#22c55e20" : "var(--a-bg-hover)",
                      color: item.show_on_app ? "#4ade80" : "var(--a-text-5)",
                      border: `1px solid ${item.show_on_app ? "#22c55e40" : "var(--a-border)"}`,
                    }}
                    title="Показувати в додатку"
                  >
                    Додаток
                  </button>

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
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--a-bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    title={item.is_enabled ? "Вимкнути" : "Увімкнути"}
                  >
                    {item.is_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={saving}
                    className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                    style={{ color: "#ef4444" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--a-bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    title="Видалити"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Fields row */}
                <div
                  className="flex items-center gap-3 px-4 pb-3"
                  style={{ borderTop: "1px solid var(--a-border)" }}
                >
                  <input
                    type="text"
                    defaultValue={item.title_override_uk || ""}
                    placeholder="Свій заголовок"
                    onBlur={(e) => {
                      const val = e.target.value.trim() || null;
                      if (val !== item.title_override_uk) saveField(item.id, "title_override_uk", val);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--a-bg-hover)",
                      border: "1px solid var(--a-border)",
                      color: "var(--a-text)",
                      marginTop: 10,
                    }}
                  />
                  <input
                    type="text"
                    defaultValue={item.subtitle_uk || ""}
                    placeholder="Наприклад: Знижки до -30%"
                    onBlur={(e) => {
                      const val = e.target.value.trim() || null;
                      if (val !== item.subtitle_uk) saveField(item.id, "subtitle_uk", val);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--a-bg-hover)",
                      border: "1px solid var(--a-border)",
                      color: "var(--a-text)",
                      marginTop: 10,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
