"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Pencil, Trash2, FolderTree, Power, PowerOff,
  ChevronDown, ChevronRight, Loader2, CheckSquare, Square, X,
  Eye, EyeOff, ArrowUpDown, ImageIcon,
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

type CatNode = Cat & { children: CatNode[] };

function buildTree(cats: Cat[]): CatNode[] {
  const map = new Map<number, CatNode>();
  const roots: CatNode[] = [];
  for (const c of cats) map.set(c.cs_cart_id, { ...c, children: [] });
  for (const c of cats) {
    const n = map.get(c.cs_cart_id)!;
    if (c.parent_cs_cart_id && map.has(c.parent_cs_cart_id)) map.get(c.parent_cs_cart_id)!.children.push(n);
    else roots.push(n);
  }
  return roots;
}

function strip(h: string) {
  return h.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function flatIds(node: CatNode): string[] {
  return [node.id, ...node.children.flatMap(flatIds)];
}

export function CategoryTable({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    let list = categories;
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name_uk.toLowerCase().includes(q) || c.slug.includes(q));
    }
    return list;
  }, [categories, statusFilter, search]);

  const tree = useMemo(() => buildTree(filtered), [filtered]);
  const showTree = !search && statusFilter === "all";

  const toggleSelect = (id: string) => {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const api = async (method: string, body: Record<string, unknown>) => {
    const res = await fetch("/api/admin/categories", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.json();
  };

  const toggleStatus = async (id: string) => {
    setLoading((l) => ({ ...l, [id]: true })); setError("");
    const data = await api("PATCH", { action: "toggle", id });
    if (!data.ok) setError(data.error || "Помилка");
    router.refresh();
    setLoading((l) => ({ ...l, [id]: false }));
  };

  const bulkAction = async (action: string, extra?: Record<string, unknown>) => {
    if (selected.size === 0) return;
    setBulkLoading(true); setError("");
    const data = await api("PATCH", { action, ids: Array.from(selected), ...extra });
    if (!data.ok) setError(data.error || "Помилка");
    setSelected(new Set());
    router.refresh();
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
              style={statusFilter === s.k ? { background: "#1e1030", color: "#c084fc", border: "1px solid #581c87" } : { background: "#111116", color: "#71717a", border: "1px solid #1e1e2a" }}>
              {s.l} <span style={{ color: "#3f3f46" }}>({s.count})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#52525b" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Пошук категорій..."
              className="pl-9 pr-8 py-2 rounded-xl text-sm outline-none w-56" style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5" style={{ color: "#52525b" }} /></button>}
          </div>
          <Link href="/admin/categories/new" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shrink-0" style={{ background: "#7c3aed" }}>
            <Plus className="w-4 h-4" /> Додати
          </Link>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl" style={{ background: "#111116", border: "1px solid #1e1e2a" }}>
          <span className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Обрано: {selected.size}</span>
          <div className="w-px h-4" style={{ background: "#1e1e2a" }} />
          <button onClick={() => bulkAction("bulk-status", { status: "active" })} disabled={bulkLoading} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs" style={{ color: "#4ade80", background: "#052e16" }}>
            <Eye className="w-3.5 h-3.5" /> Увімкнути
          </button>
          <button onClick={() => bulkAction("bulk-status", { status: "disabled" })} disabled={bulkLoading} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs" style={{ color: "#71717a", background: "#18181b" }}>
            <EyeOff className="w-3.5 h-3.5" /> Вимкнути
          </button>
          <button onClick={() => { if (confirm(`Видалити ${selected.size} категорій?`)) bulkAction("bulk-delete"); }} disabled={bulkLoading} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs" style={{ color: "#f87171", background: "#1c1017" }}>
            <Trash2 className="w-3.5 h-3.5" /> Видалити
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs" style={{ color: "#52525b" }}>Скасувати</button>
          {bulkLoading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7c3aed" }} />}
        </div>
      )}

      {error && <div className="mb-4 px-4 py-2.5 rounded-lg text-sm" style={{ color: "#f87171", background: "#450a0a", border: "1px solid #7f1d1d" }}>{error}</div>}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e2a" }}>
              <th className="w-10 px-4 py-3">
                <button onClick={selectAll}>{selected.size === filtered.length && filtered.length > 0
                  ? <CheckSquare className="w-4 h-4" style={{ color: "#7c3aed" }} />
                  : <Square className="w-4 h-4" style={{ color: "#3f3f46" }} />}
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Категорія</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Slug</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Товарів</th>
              <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Позиція</th>
              <th className="text-center px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Статус</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#3f3f46" }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {showTree
              ? tree.map((c) => <TreeRow key={c.id} cat={c} depth={0} selected={selected} onToggleSelect={toggleSelect} collapsed={collapsed} onToggleCollapse={toggleCollapse} loading={loading} onToggleStatus={toggleStatus} />)
              : filtered.map((c) => <FlatRow key={c.id} cat={c} selected={selected} onToggleSelect={toggleSelect} loading={loading} onToggleStatus={toggleStatus} />)
            }
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: "#3f3f46" }}>
                {search ? "Нічого не знайдено" : "Категорій немає"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tree Row (hierarchical) ─── */
function TreeRow({
  cat, depth, selected, onToggleSelect, collapsed, onToggleCollapse, loading, onToggleStatus,
}: {
  cat: CatNode; depth: number; selected: Set<string>; onToggleSelect: (id: string) => void;
  collapsed: Set<string>; onToggleCollapse: (id: string) => void;
  loading: Record<string, boolean>; onToggleStatus: (id: string) => void;
}) {
  const isCollapsed = collapsed.has(cat.id);
  const hasChildren = cat.children.length > 0;
  const desc = cat.description_uk ? strip(cat.description_uk) : null;

  return (
    <>
      <tr style={{ borderBottom: "1px solid #141420" }} className="group">
        <td className="w-10 px-4 py-2.5">
          <button onClick={() => onToggleSelect(cat.id)}>
            {selected.has(cat.id) ? <CheckSquare className="w-4 h-4" style={{ color: "#7c3aed" }} /> : <Square className="w-4 h-4" style={{ color: "#3f3f46" }} />}
          </button>
        </td>
        <td className="px-4 py-2.5">
          <div style={{ paddingLeft: depth * 24 }}>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button onClick={() => onToggleCollapse(cat.id)} className="p-0.5 rounded" style={{ color: "#52525b" }}>
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              ) : <span className="w-5" />}
              {cat.image_url ? (
                <img src={cat.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" style={{ background: "#141420" }} />
              ) : (
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "#141420" }}>
                  <FolderTree className="w-3.5 h-3.5" style={{ color: "#3f3f46" }} />
                </div>
              )}
              <div className="min-w-0">
                <Link href={`/admin/categories/${cat.id}`} className="text-sm hover:underline" style={{ color: cat.status === "active" ? "#e4e4e7" : "#52525b" }}>
                  {cat.name_uk}
                </Link>
                {desc && <p className="text-[11px] mt-0.5 line-clamp-1 leading-relaxed" style={{ color: "#3f3f46" }}>{desc}</p>}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "#52525b" }}>{cat.slug}</td>
        <td className="px-4 py-2.5 text-right text-xs tabular-nums" style={{ color: "#71717a" }}>
          {cat.product_count > 0 ? (
            <Link href={`/admin/products?search=&status=all`} className="hover:underline">{cat.product_count}</Link>
          ) : <span style={{ color: "#3f3f46" }}>0</span>}
        </td>
        <td className="px-4 py-2.5 text-center text-xs font-mono tabular-nums" style={{ color: "#52525b" }}>{cat.position}</td>
        <td className="px-4 py-2.5 text-center">
          <button onClick={() => onToggleStatus(cat.id)} disabled={loading[cat.id]} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors" title={cat.status === "active" ? "Натисніть щоб вимкнути" : "Натисніть щоб увімкнути"}
            style={cat.status === "active" ? { color: "#4ade80", background: "#052e16" } : { color: "#71717a", background: "#18181b" }}>
            {loading[cat.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : cat.status === "active" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {cat.status === "active" ? "Актив" : "Вимк"}
          </button>
        </td>
        <td className="px-4 py-2.5 text-right">
          <Link href={`/admin/categories/${cat.id}`} className="inline-flex p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#71717a" }} title="Редагувати">
            <Pencil className="w-4 h-4" />
          </Link>
        </td>
      </tr>
      {hasChildren && !isCollapsed && cat.children.map((ch) => (
        <TreeRow key={ch.id} cat={ch} depth={depth + 1} selected={selected} onToggleSelect={onToggleSelect} collapsed={collapsed} onToggleCollapse={onToggleCollapse} loading={loading} onToggleStatus={onToggleStatus} />
      ))}
    </>
  );
}

/* ─── Flat Row (when searching/filtering) ─── */
function FlatRow({
  cat, selected, onToggleSelect, loading, onToggleStatus,
}: {
  cat: Cat; selected: Set<string>; onToggleSelect: (id: string) => void;
  loading: Record<string, boolean>; onToggleStatus: (id: string) => void;
}) {
  const desc = cat.description_uk ? strip(cat.description_uk) : null;

  return (
    <tr style={{ borderBottom: "1px solid #141420" }} className="group">
      <td className="w-10 px-4 py-2.5">
        <button onClick={() => onToggleSelect(cat.id)}>
          {selected.has(cat.id) ? <CheckSquare className="w-4 h-4" style={{ color: "#7c3aed" }} /> : <Square className="w-4 h-4" style={{ color: "#3f3f46" }} />}
        </button>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {cat.image_url ? (
            <img src={cat.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" style={{ background: "#141420" }} />
          ) : (
            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "#141420" }}>
              <FolderTree className="w-3.5 h-3.5" style={{ color: "#3f3f46" }} />
            </div>
          )}
          <div className="min-w-0">
            <Link href={`/admin/categories/${cat.id}`} className="text-sm hover:underline" style={{ color: cat.status === "active" ? "#e4e4e7" : "#52525b" }}>
              {cat.name_uk}
            </Link>
            {desc && <p className="text-[11px] mt-0.5 line-clamp-1 leading-relaxed" style={{ color: "#3f3f46" }}>{desc}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "#52525b" }}>{cat.slug}</td>
      <td className="px-4 py-2.5 text-right text-xs tabular-nums" style={{ color: "#71717a" }}>
        {cat.product_count > 0 ? cat.product_count : <span style={{ color: "#3f3f46" }}>0</span>}
      </td>
      <td className="px-4 py-2.5 text-center text-xs font-mono tabular-nums" style={{ color: "#52525b" }}>{cat.position}</td>
      <td className="px-4 py-2.5 text-center">
        <button onClick={() => onToggleStatus(cat.id)} disabled={loading[cat.id]} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors" title={cat.status === "active" ? "Натисніть щоб вимкнути" : "Натисніть щоб увімкнути"}
          style={cat.status === "active" ? { color: "#4ade80", background: "#052e16" } : { color: "#71717a", background: "#18181b" }}>
          {loading[cat.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : cat.status === "active" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {cat.status === "active" ? "Актив" : "Вимк"}
        </button>
      </td>
      <td className="px-4 py-2.5 text-right">
        <Link href={`/admin/categories/${cat.id}`} className="inline-flex p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#71717a" }} title="Редагувати">
          <Pencil className="w-4 h-4" />
        </Link>
      </td>
    </tr>
  );
}
