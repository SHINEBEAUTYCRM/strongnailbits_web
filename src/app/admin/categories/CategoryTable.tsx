"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Pencil, Trash2, FolderTree,
  ChevronDown, ChevronRight, Loader2, CheckSquare, Square, X,
  Eye, EyeOff, ImageIcon,
} from "lucide-react";

interface Cat {
  id: string;
  cs_cart_id: number;
  parent_cs_cart_id: number | null;
  name_uk: string;
  slug: string;
  status: string;
  product_count: number;
  position: number;
  description_uk: string | null;
  image_url: string | null;
}

type CatNode = Cat & { children: CatNode[]; totalProducts: number };

function buildTree(cats: Cat[]): CatNode[] {
  const map = new Map<number, CatNode>();
  const roots: CatNode[] = [];
  for (const c of cats) map.set(c.cs_cart_id, { ...c, children: [], totalProducts: c.product_count });
  for (const c of cats) {
    const n = map.get(c.cs_cart_id)!;
    if (c.parent_cs_cart_id && map.has(c.parent_cs_cart_id)) {
      const parent = map.get(c.parent_cs_cart_id)!;
      parent.children.push(n);
      parent.totalProducts += c.product_count;
    } else {
      roots.push(n);
    }
  }
  roots.sort((a, b) => a.position - b.position);
  for (const r of roots) r.children.sort((a, b) => a.position - b.position);
  return roots;
}

function strip(h: string) {
  return h.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export function CategoryTable({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState("");
  // Optimistic status overrides
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const tree = useMemo(() => buildTree(categories), [categories]);

  const filteredTree = useMemo(() => {
    let roots = tree;
    if (statusFilter !== "all") {
      roots = roots.map((r) => ({
        ...r,
        children: r.children.filter((c) => c.status === statusFilter),
      })).filter((r) => r.status === statusFilter || r.children.length > 0);
    }
    if (search) {
      const q = search.toLowerCase();
      roots = roots.map((r) => ({
        ...r,
        children: r.children.filter((c) => c.name_uk.toLowerCase().includes(q) || c.slug.includes(q)),
      })).filter((r) => r.name_uk.toLowerCase().includes(q) || r.slug.includes(q) || r.children.length > 0);
    }
    return roots;
  }, [tree, statusFilter, search]);

  const allFlat = useMemo(() => categories, [categories]);

  const toggleSelect = (id: string) => {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const selectAll = () => {
    const allIds = allFlat.map((c) => c.id);
    if (selected.size === allIds.length) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleExpand = (id: string) => {
    setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const expandAll = () => {
    const rootIds = tree.filter((r) => r.children.length > 0).map((r) => r.id);
    if (expanded.size >= rootIds.length) setExpanded(new Set());
    else setExpanded(new Set(rootIds));
  };

  const getStatus = useCallback((cat: Cat) => statusOverrides[cat.id] ?? cat.status, [statusOverrides]);

  const toggleStatus = useCallback(async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;

    const currentStatus = getStatus(cat);
    const newStatus = currentStatus === "active" ? "disabled" : "active";

    // Optimistic update
    setStatusOverrides((prev) => ({ ...prev, [id]: newStatus }));
    setLoadingIds((s) => { const n = new Set(s); n.add(id); return n; });
    setError("");

    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id }),
      });
      const data = await res.json();
      if (!data.ok) {
        // Revert optimistic update
        setStatusOverrides((prev) => { const n = { ...prev }; delete n[id]; return n; });
        setError(data.error || "Помилка зміни статусу");
      } else {
        // Refresh server data, keep override until refresh completes
        router.refresh();
      }
    } catch {
      setStatusOverrides((prev) => { const n = { ...prev }; delete n[id]; return n; });
      setError("Помилка мережі");
    } finally {
      setLoadingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }, [categories, router, getStatus]);

  const bulkAction = async (action: string, extra?: Record<string, unknown>) => {
    if (selected.size === 0) return;
    setBulkLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selected), ...extra }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error || "Помилка");
      else router.refresh();
    } catch {
      setError("Помилка мережі");
    }
    setSelected(new Set());
    setBulkLoading(false);
  };

  const statuses = [
    { k: "all" as const, l: "Всі", count: categories.length },
    { k: "active" as const, l: "Активні", count: categories.filter((c) => c.status === "active").length },
    { k: "disabled" as const, l: "Вимкнені", count: categories.filter((c) => c.status !== "active").length },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button key={s.k} onClick={() => setStatusFilter(s.k)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={statusFilter === s.k ? { background: "var(--a-accent-bg)", color: "var(--a-accent)", border: "1px solid var(--a-accent)" } : { background: "var(--a-bg-card)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}>
              {s.l} <span style={{ color: "var(--a-text-5)" }}>({s.count})</span>
            </button>
          ))}
          <button onClick={expandAll} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: "var(--a-bg-card)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}>
            {expanded.size >= tree.filter((r) => r.children.length > 0).length ? "Згорнути все" : "Розгорнути все"}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--a-text-4)" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Пошук категорій..."
              className="pl-9 pr-8 py-2 rounded-xl text-sm outline-none w-56" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text)" }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5" style={{ color: "var(--a-text-4)" }} /></button>}
          </div>
          <Link href="/admin/categories/new" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0" style={{ background: "var(--a-accent-btn)" }}>
            <Plus className="w-4 h-4" /> Додати
          </Link>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--a-text-2)" }}>Обрано: {selected.size}</span>
          <div className="w-px h-4" style={{ background: "var(--a-border)" }} />
          <button onClick={() => bulkAction("bulk-status", { status: "active" })} disabled={bulkLoading} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs" style={{ color: "#4ade80", background: "#052e16" }}>
            <Eye className="w-3.5 h-3.5" /> Увімкнути
          </button>
          <button onClick={() => bulkAction("bulk-status", { status: "disabled" })} disabled={bulkLoading} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs" style={{ color: "#71717a", background: "#18181b" }}>
            <EyeOff className="w-3.5 h-3.5" /> Вимкнути
          </button>
          <button onClick={() => { if (confirm(`Видалити ${selected.size} категорій?`)) bulkAction("bulk-delete"); }} disabled={bulkLoading} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs" style={{ color: "#f87171", background: "#1c1017" }}>
            <Trash2 className="w-3.5 h-3.5" /> Видалити
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs" style={{ color: "var(--a-text-4)" }}>Скасувати</button>
          {bulkLoading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--a-accent-btn)" }} />}
        </div>
      )}

      {error && <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" }}>{error}</div>}

      {/* Category cards */}
      <div className="space-y-3">
        {filteredTree.map((root) => {
          const isOpen = expanded.has(root.id);
          const rootStatus = getStatus(root);
          const hasChildren = root.children.length > 0;
          const desc = root.description_uk ? strip(root.description_uk) : null;

          return (
            <div key={root.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
              {/* Root category row */}
              <div className="flex items-center gap-3 px-4 py-3 group" style={{ borderBottom: isOpen ? "1px solid var(--a-border)" : "none" }}>
                {/* Checkbox */}
                <button onClick={() => toggleSelect(root.id)} className="shrink-0">
                  {selected.has(root.id) ? <CheckSquare className="w-4 h-4" style={{ color: "var(--a-accent-btn)" }} /> : <Square className="w-4 h-4" style={{ color: "var(--a-text-5)" }} />}
                </button>

                {/* Expand toggle */}
                {hasChildren ? (
                  <button onClick={() => toggleExpand(root.id)} className="shrink-0 p-1 rounded-lg transition-colors" style={{ color: "var(--a-text-4)" }}>
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : <span className="w-6 shrink-0" />}

                {/* Image */}
                {root.image_url ? (
                  <img src={root.image_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" style={{ background: "var(--a-bg-input)" }} />
                ) : (
                  <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: "var(--a-bg-input)" }}>
                    <FolderTree className="w-4 h-4" style={{ color: "var(--a-text-5)" }} />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/categories/${root.id}`} className="text-sm font-medium hover:underline truncate" style={{ color: rootStatus === "active" ? "var(--a-text)" : "var(--a-text-4)" }}>
                      {root.name_uk}
                    </Link>
                    {hasChildren && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--a-bg-input)", color: "var(--a-text-4)" }}>
                        {root.children.length} підкат.
                      </span>
                    )}
                  </div>
                  {desc && <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: "var(--a-text-5)" }}>{desc}</p>}
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] uppercase" style={{ color: "var(--a-text-5)" }}>Товарів</p>
                    <p className="text-sm font-mono tabular-nums" style={{ color: root.totalProducts > 0 ? "var(--a-text-2)" : "var(--a-text-5)" }}>{root.totalProducts}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase" style={{ color: "var(--a-text-5)" }}>Slug</p>
                    <p className="text-xs font-mono truncate max-w-[120px]" style={{ color: "var(--a-text-4)" }}>{root.slug}</p>
                  </div>
                </div>

                {/* Status toggle */}
                <button onClick={() => toggleStatus(root.id)} disabled={loadingIds.has(root.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  title={rootStatus === "active" ? "Вимкнути категорію" : "Увімкнути категорію"}
                  style={rootStatus === "active" ? { color: "#4ade80", background: "#052e16", border: "1px solid #14532d" } : { color: "#71717a", background: "#18181b", border: "1px solid #27272a" }}>
                  {loadingIds.has(root.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : rootStatus === "active" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {rootStatus === "active" ? "Активна" : "Вимкнена"}
                </button>

                {/* Edit */}
                <Link href={`/admin/categories/${root.id}`} className="shrink-0 p-2 rounded-lg transition-colors" style={{ color: "var(--a-text-5)" }} title="Редагувати"
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--a-text-2)"; e.currentTarget.style.background = "var(--a-bg-input)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-5)"; e.currentTarget.style.background = "transparent"; }}>
                  <Pencil className="w-4 h-4" />
                </Link>
              </div>

              {/* Subcategories dropdown */}
              {hasChildren && isOpen && (
                <div style={{ background: "var(--a-bg)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                        <th className="w-10 pl-14 pr-2 py-2" />
                        <th className="text-left px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-6)" }}>Підкатегорія</th>
                        <th className="text-left px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-6)" }}>Slug</th>
                        <th className="text-right px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-6)" }}>Товарів</th>
                        <th className="text-center px-3 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-6)" }}>Статус</th>
                        <th className="w-10 px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {root.children.map((sub) => {
                        const subStatus = getStatus(sub);
                        return (
                          <tr key={sub.id} style={{ borderBottom: "1px solid var(--a-border)" }} className="group/sub">
                            <td className="pl-14 pr-2 py-2">
                              <button onClick={() => toggleSelect(sub.id)} className="shrink-0">
                                {selected.has(sub.id) ? <CheckSquare className="w-3.5 h-3.5" style={{ color: "var(--a-accent-btn)" }} /> : <Square className="w-3.5 h-3.5" style={{ color: "var(--a-text-6)" }} />}
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {sub.image_url ? (
                                  <img src={sub.image_url} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" style={{ background: "var(--a-bg-input)" }} />
                                ) : (
                                  <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "var(--a-bg-card)" }}>
                                    <FolderTree className="w-3 h-3" style={{ color: "var(--a-text-6)" }} />
                                  </div>
                                )}
                                <Link href={`/admin/categories/${sub.id}`} className="text-xs hover:underline truncate" style={{ color: subStatus === "active" ? "var(--a-text-2)" : "var(--a-text-5)" }}>
                                  {sub.name_uk}
                                </Link>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-[11px] font-mono truncate max-w-[100px]" style={{ color: "var(--a-text-5)" }}>{sub.slug}</td>
                            <td className="px-3 py-2 text-right text-xs tabular-nums" style={{ color: sub.product_count > 0 ? "var(--a-text-3)" : "var(--a-text-6)" }}>{sub.product_count}</td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => toggleStatus(sub.id)} disabled={loadingIds.has(sub.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                                title={subStatus === "active" ? "Вимкнути" : "Увімкнути"}
                                style={subStatus === "active" ? { color: "#4ade80", background: "#052e16" } : { color: "#52525b", background: "#18181b" }}>
                                {loadingIds.has(sub.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : subStatus === "active" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                {subStatus === "active" ? "Актив" : "Вимк"}
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              <Link href={`/admin/categories/${sub.id}`} className="p-1 rounded-lg transition-colors inline-flex" style={{ color: "var(--a-text-6)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--a-text-2)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-6)"; }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {filteredTree.length === 0 && (
          <div className="rounded-2xl px-4 py-12 text-center" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-5)" }}>
            {search ? "Нічого не знайдено" : "Категорій немає"}
          </div>
        )}
      </div>
    </div>
  );
}
