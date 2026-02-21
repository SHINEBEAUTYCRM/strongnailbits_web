"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GripVertical,
  Plus,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Save,
  Wand2,
  Minus,
  ArrowUp,
  ArrowDown,
  Pencil,
  X,
  Loader2,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MenuItemNode {
  id: string;
  label_uk: string;
  label_ru: string | null;
  url: string | null;
  item_type: string;
  target: string;
  icon: string | null;
  badge_text: string | null;
  badge_color: string | null;
  is_visible: boolean;
  category_id: string | null;
  page_id: string | null;
  children: MenuItemNode[];
  categories?: { id: string; slug: string; name_uk: string; name_ru: string | null; product_count: number } | null;
}

interface MenuInfo {
  id: string;
  handle: string;
  name: string;
}

const TABS: { handle: string; label: string }[] = [
  { handle: "header", label: "Header" },
  { handle: "footer", label: "Footer" },
  { handle: "mobile", label: "Mobile" },
];

function buildItemTree(flat: any[]): MenuItemNode[] {
  const map = new Map<string, MenuItemNode>();
  const roots: MenuItemNode[] = [];

  for (const item of flat) {
    map.set(item.id, { ...item, children: [] });
  }
  for (const item of flat) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export default function NavigationPage() {
  const [menus, setMenus] = useState<MenuInfo[]>([]);
  const [activeTab, setActiveTab] = useState("header");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItemNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [newLink, setNewLink] = useState({ label_uk: "", label_ru: "", url: "" });

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMenu = useCallback(async (handle: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/navigation?menu=${handle}`);
      const data = await res.json();
      setMenuId(data.menu_id);
      setItems(buildItemTree(data.items ?? []));
    } catch {
      showToast("Помилка завантаження", "err");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/admin/navigation")
      .then((r) => r.json())
      .then((d) => setMenus(d.menus ?? []));
    loadMenu(activeTab);
  }, []);

  useEffect(() => {
    loadMenu(activeTab);
  }, [activeTab, loadMenu]);

  const handleSave = async () => {
    if (!menuId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, items }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Збережено!");
        loadMenu(activeTab);
      } else {
        showToast(data.error || "Помилка", "err");
      }
    } catch {
      showToast("Помилка збереження", "err");
    }
    setSaving(false);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/navigation/seed", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        showToast(`Додано ${data.count} пунктів`);
        loadMenu(activeTab);
      } else {
        showToast(data.error || "Помилка", "err");
      }
    } catch {
      showToast("Помилка seed", "err");
    }
    setSeeding(false);
  };

  const addCustomLink = () => {
    if (!newLink.label_uk.trim() || !newLink.url.trim()) return;
    const item: MenuItemNode = {
      id: crypto.randomUUID(),
      label_uk: newLink.label_uk,
      label_ru: newLink.label_ru || null,
      url: newLink.url,
      item_type: "custom_link",
      target: "_self",
      icon: null,
      badge_text: null,
      badge_color: null,
      is_visible: true,
      category_id: null,
      page_id: null,
      children: [],
    };
    setItems((prev) => [...prev, item]);
    setNewLink({ label_uk: "", label_ru: "", url: "" });
    setAddLinkOpen(false);
  };

  const addSeparator = () => {
    const item: MenuItemNode = {
      id: crypto.randomUUID(),
      label_uk: "──────",
      label_ru: null,
      url: null,
      item_type: "separator",
      target: "_self",
      icon: null,
      badge_text: null,
      badge_color: null,
      is_visible: true,
      category_id: null,
      page_id: null,
      children: [],
    };
    setItems((prev) => [...prev, item]);
  };

  const removeItem = (id: string) => {
    function filterOut(nodes: MenuItemNode[]): MenuItemNode[] {
      return nodes
        .filter((n) => n.id !== id)
        .map((n) => ({ ...n, children: filterOut(n.children) }));
    }
    setItems(filterOut(items));
  };

  const toggleVisibility = (id: string) => {
    function toggle(nodes: MenuItemNode[]): MenuItemNode[] {
      return nodes.map((n) =>
        n.id === id
          ? { ...n, is_visible: !n.is_visible }
          : { ...n, children: toggle(n.children) },
      );
    }
    setItems(toggle(items));
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((n) => n.id === id);
      if (idx === -1) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const updateItem = (id: string, patch: Partial<MenuItemNode>) => {
    function update(nodes: MenuItemNode[]): MenuItemNode[] {
      return nodes.map((n) =>
        n.id === id
          ? { ...n, ...patch }
          : { ...n, children: update(n.children) },
      );
    }
    setItems(update(items));
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "category": return <FolderTree size={14} className="text-[var(--a-text-4)]" />;
      case "custom_link": return <LinkIcon size={14} className="text-[var(--a-text-4)]" />;
      case "separator": return <Minus size={14} className="text-[var(--a-text-4)]" />;
      default: return <ChevronRight size={14} className="text-[var(--a-text-4)]" />;
    }
  };

  function renderItem(item: MenuItemNode, depth: number, idx: number, total: number) {
    const isEditing = editingId === item.id;

    return (
      <div key={item.id}>
        <div
          className={`group flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
            !item.is_visible ? "opacity-50" : ""
          }`}
          style={{
            marginLeft: depth * 24,
            borderColor: "var(--a-border)",
            background: isEditing ? "var(--a-bg-input)" : "var(--a-bg-card)",
          }}
        >
          <GripVertical size={16} className="shrink-0 cursor-grab text-[var(--a-text-4)]" />
          {typeIcon(item.item_type)}

          {item.item_type === "separator" ? (
            <span className="flex-1 text-sm text-[var(--a-text-4)]">── Роздільник ──</span>
          ) : (
            <span className="flex-1 truncate text-sm font-medium" style={{ color: "var(--a-text)" }}>
              {item.label_uk}
              {item.categories?.product_count != null && (
                <span className="ml-1.5 text-xs font-normal text-[var(--a-text-4)]">
                  ({item.categories.product_count})
                </span>
              )}
            </span>
          )}

          {item.badge_text && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ background: item.badge_color || "#EF4444" }}
            >
              {item.badge_text}
            </span>
          )}

          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {depth === 0 && (
              <>
                <button
                  onClick={() => moveItem(item.id, -1)}
                  disabled={idx === 0}
                  className="rounded p-1 hover:bg-[var(--a-bg-hover)] disabled:opacity-30"
                  title="Вгору"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => moveItem(item.id, 1)}
                  disabled={idx === total - 1}
                  className="rounded p-1 hover:bg-[var(--a-bg-hover)] disabled:opacity-30"
                  title="Вниз"
                >
                  <ArrowDown size={14} />
                </button>
              </>
            )}
            <button
              onClick={() => toggleVisibility(item.id)}
              className="rounded p-1 hover:bg-[var(--a-bg-hover)]"
              title={item.is_visible ? "Приховати" : "Показати"}
            >
              {item.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={() => setEditingId(isEditing ? null : item.id)}
              className="rounded p-1 hover:bg-[var(--a-bg-hover)]"
              title="Редагувати"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => {
                if (confirm(`Видалити "${item.label_uk}"?`)) removeItem(item.id);
              }}
              className="rounded p-1 text-red-400 hover:bg-red-500/10"
              title="Видалити"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {isEditing && (
          <div
            className="mt-1 rounded-lg border p-3"
            style={{ marginLeft: depth * 24, borderColor: "var(--a-border)", background: "var(--a-bg-input)" }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--a-text-4)]">Назва (UK)</label>
                <input
                  value={item.label_uk}
                  onChange={(e) => updateItem(item.id, { label_uk: e.target.value })}
                  className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                  style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)", color: "var(--a-text)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--a-text-4)]">Назва (RU)</label>
                <input
                  value={item.label_ru ?? ""}
                  onChange={(e) => updateItem(item.id, { label_ru: e.target.value || null })}
                  className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                  style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)", color: "var(--a-text)" }}
                />
              </div>
              {item.item_type === "custom_link" && (
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-[var(--a-text-4)]">URL</label>
                  <input
                    value={item.url ?? ""}
                    onChange={(e) => updateItem(item.id, { url: e.target.value || null })}
                    className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                    style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)", color: "var(--a-text)" }}
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-[var(--a-text-4)]">Бейдж</label>
                <input
                  value={item.badge_text ?? ""}
                  onChange={(e) => updateItem(item.id, { badge_text: e.target.value || null })}
                  placeholder="напр. NEW"
                  className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                  style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)", color: "var(--a-text)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--a-text-4)]">Колір бейджу</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={item.badge_color || "#EF4444"}
                    onChange={(e) => updateItem(item.id, { badge_color: e.target.value })}
                    className="h-[34px] w-10 cursor-pointer rounded border"
                    style={{ borderColor: "var(--a-border)" }}
                  />
                  <input
                    value={item.badge_color || "#EF4444"}
                    onChange={(e) => updateItem(item.id, { badge_color: e.target.value })}
                    className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                    style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)", color: "var(--a-text)" }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditingId(null)}
              className="mt-3 flex items-center gap-1 text-xs text-[var(--a-accent)]"
            >
              <X size={12} /> Закрити
            </button>
          </div>
        )}

        {item.children.map((child, ci) =>
          renderItem(child, depth + 1, ci, item.children.length),
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>
          Навігація
        </h1>
        <button
          onClick={handleSave}
          disabled={saving || !menuId}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: "var(--a-accent-btn)" }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Зберегти
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 rounded-lg px-4 py-2.5 text-sm font-medium ${
            toast.type === "ok" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border p-1" style={{ borderColor: "var(--a-border)", background: "var(--a-bg-input)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.handle}
            onClick={() => setActiveTab(tab.handle)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.handle
                ? "text-white shadow-sm"
                : "text-[var(--a-text-4)] hover:text-[var(--a-text)]"
            }`}
            style={activeTab === tab.handle ? { background: "var(--a-accent)" } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Left: menu items */}
        <div className="min-w-0 flex-[3]">
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)" }}
          >
            <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--a-text)" }}>
              Пункти меню
              <span className="ml-2 text-xs font-normal text-[var(--a-text-4)]">
                ({items.length})
              </span>
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[var(--a-text-4)]" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--a-text-4)]">
                Меню порожнє. Додайте пункти або натисніть &quot;Авто-заповнити&quot;.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {items.map((item, i) => renderItem(item, 0, i, items.length))}
              </div>
            )}
          </div>
        </div>

        {/* Right: add panel */}
        <div className="w-72 shrink-0">
          <div
            className="sticky top-[80px] rounded-xl border p-4"
            style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)" }}
          >
            <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--a-text)" }}>
              Додати
            </h2>

            <div className="flex flex-col gap-2">
              {/* Add link */}
              <button
                onClick={() => setAddLinkOpen(!addLinkOpen)}
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-[var(--a-bg-hover)]"
                style={{ borderColor: "var(--a-border)", color: "var(--a-text)" }}
              >
                <LinkIcon size={16} />
                Додати посилання
              </button>

              {addLinkOpen && (
                <div className="rounded-lg border p-3" style={{ borderColor: "var(--a-border)", background: "var(--a-bg-input)" }}>
                  <div className="flex flex-col gap-2">
                    <input
                      value={newLink.label_uk}
                      onChange={(e) => setNewLink((p) => ({ ...p, label_uk: e.target.value }))}
                      placeholder="Назва (UK)"
                      className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                      style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)", color: "var(--a-text)" }}
                    />
                    <input
                      value={newLink.label_ru}
                      onChange={(e) => setNewLink((p) => ({ ...p, label_ru: e.target.value }))}
                      placeholder="Назва (RU)"
                      className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                      style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)", color: "var(--a-text)" }}
                    />
                    <input
                      value={newLink.url}
                      onChange={(e) => setNewLink((p) => ({ ...p, url: e.target.value }))}
                      placeholder="URL (напр. /blog)"
                      className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                      style={{ borderColor: "var(--a-border)", background: "var(--a-bg-card)", color: "var(--a-text)" }}
                    />
                    <button
                      onClick={addCustomLink}
                      disabled={!newLink.label_uk.trim() || !newLink.url.trim()}
                      className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: "var(--a-accent)" }}
                    >
                      <Plus size={14} /> Додати
                    </button>
                  </div>
                </div>
              )}

              {/* Add separator */}
              <button
                onClick={addSeparator}
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-[var(--a-bg-hover)]"
                style={{ borderColor: "var(--a-border)", color: "var(--a-text)" }}
              >
                <Minus size={16} />
                Додати роздільник
              </button>

              {/* Auto-seed */}
              {activeTab === "header" && items.length === 0 && (
                <>
                  <div className="my-1 border-t" style={{ borderColor: "var(--a-border)" }} />
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--a-bg-hover)]"
                    style={{ borderColor: "var(--a-accent)", color: "var(--a-accent)" }}
                  >
                    {seeding ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    Авто-заповнити
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
