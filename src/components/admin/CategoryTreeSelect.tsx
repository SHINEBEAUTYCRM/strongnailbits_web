"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronRight, ChevronDown, Search, FolderTree, X } from "lucide-react";

interface CategoryRow {
  id: string;
  name_uk: string;
  name_ru: string | null;
  cs_cart_id: number;
  parent_cs_cart_id: number | null;
  product_count: number;
  position: number;
}

interface TreeNode extends CategoryRow {
  children: TreeNode[];
}

interface Props {
  categories: CategoryRow[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

function buildTree(rows: CategoryRow[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const r of rows) {
    map.set(r.cs_cart_id, { ...r, children: [] });
  }

  for (const r of rows) {
    const node = map.get(r.cs_cart_id)!;
    if (r.parent_cs_cart_id && map.has(r.parent_cs_cart_id)) {
      map.get(r.parent_cs_cart_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const hasPositioned = roots.some((r) => r.position > 0);
  return hasPositioned ? roots.filter((r) => r.position > 0) : roots;
}

function getPathByCsCart(map: Map<string, CategoryRow>, csCartId: number): string[] {
  const cat = Array.from(map.values()).find((c) => c.cs_cart_id === csCartId);
  if (!cat) return [];
  const path: string[] = [cat.name_uk];
  let parentCsCartId = cat.parent_cs_cart_id;
  while (parentCsCartId) {
    const parent = Array.from(map.values()).find((c) => c.cs_cart_id === parentCsCartId);
    if (!parent) break;
    path.unshift(parent.name_uk);
    parentCsCartId = parent.parent_cs_cart_id;
  }
  return path;
}

export function CategoryTreeSelect({ categories, value, onChange, placeholder = "Оберіть категорію" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const tree = useMemo(() => buildTree(categories), [categories]);

  const catMap = useMemo(() => {
    const m = new Map<string, CategoryRow>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const selectedPath = useMemo(() => {
    if (!value) return "";
    const cat = catMap.get(value);
    if (!cat) return "";
    const pathParts = getPathByCsCart(catMap, cat.cs_cart_id);
    return pathParts.length > 0 ? pathParts.join(" → ") : cat.name_uk;
  }, [value, catMap]);

  const query = search.toLowerCase().trim();

  const filteredTree = useMemo(() => {
    if (!query) return tree;
    function filterNode(node: TreeNode): TreeNode | null {
      const childMatches = node.children
        .map(filterNode)
        .filter(Boolean) as TreeNode[];
      const selfMatch =
        node.name_uk.toLowerCase().includes(query) ||
        (node.name_ru?.toLowerCase().includes(query) ?? false);
      if (selfMatch || childMatches.length > 0) {
        return { ...node, children: selfMatch ? node.children : childMatches };
      }
      return null;
    }
    return tree.map(filterNode).filter(Boolean) as TreeNode[];
  }, [tree, query]);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const toggleExpand = useCallback((csCartId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(csCartId)) next.delete(csCartId);
      else next.add(csCartId);
      return next;
    });
  }, []);

  const select = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
    },
    [onChange],
  );

  const isExpanded = (csCartId: number) => expanded.has(csCartId) || query.length > 0;

  function renderNode(node: TreeNode, depth: number) {
    const hasChildren = node.children.length > 0;
    const nodeExpanded = isExpanded(node.cs_cart_id);
    const isSelected = node.id === value;
    const isEmpty = node.product_count === 0;

    return (
      <div key={node.id}>
        <button
          type="button"
          onClick={() => select(node.id)}
          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
            isSelected
              ? "bg-[var(--a-accent)]/10 font-medium text-[var(--a-accent)]"
              : "text-[var(--a-text)] hover:bg-[var(--a-bg-hover)]"
          } ${isEmpty && !isSelected ? "opacity-50" : ""}`}
          style={{ paddingLeft: `${8 + depth * 20}px` }}
        >
          {hasChildren ? (
            <span
              onClick={(e) => toggleExpand(node.cs_cart_id, e)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[var(--a-bg-input)]"
            >
              {nodeExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <span className={depth === 0 ? "font-semibold" : ""}>
            {node.name_uk}
          </span>
          <span className="ml-auto shrink-0 text-xs text-[var(--a-text-4)]">
            {node.product_count}
          </span>
        </button>
        {hasChildren && nodeExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[var(--a-text-4)]">
        Категорія
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
          open
            ? "border-[var(--a-accent)] ring-1 ring-[var(--a-accent)]/30"
            : "border-[var(--a-border)] hover:border-[var(--a-text-4)]"
        } bg-[var(--a-bg-input)] text-[var(--a-text)]`}
      >
        <FolderTree size={16} className="shrink-0 text-[var(--a-text-4)]" />
        <span className={`flex-1 truncate ${!value ? "text-[var(--a-text-4)]" : ""}`}>
          {value ? selectedPath : placeholder}
        </span>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-[var(--a-bg-hover)]"
          >
            <X size={14} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[var(--a-border)] bg-[var(--a-bg-card)] shadow-xl">
          <div className="border-b border-[var(--a-border)] p-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--a-text-4)]" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пошук категорії..."
                className="w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg-input)] py-2 pl-8 pr-3 text-sm text-[var(--a-text)] placeholder:text-[var(--a-text-4)] focus:border-[var(--a-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--a-accent)]/30"
              />
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-1">
            {filteredTree.length > 0 ? (
              filteredTree.map((node) => renderNode(node, 0))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-[var(--a-text-4)]">
                Нічого не знайдено
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
