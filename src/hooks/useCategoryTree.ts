"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CatNode {
  id: string;
  cs_cart_id: number;
  name_uk: string;
  name_ru: string | null;
  slug: string;
  product_count: number;
  total_product_count: number;
  position: number;
  children: CatNode[];
}

const HIDDEN = ["удалить", "удалити", "видалити", "тест", "test", "temp", "tmp", "trash"];

/* ─── module-level cache (shared across all components) ─── */
let _cache: CatNode[] | null = null;
let _promise: Promise<CatNode[]> | null = null;

/** Recursively find a node by cs_cart_id */
function findNode(nodes: CatNode[], id: number): CatNode | null {
  for (const n of nodes) {
    if (n.cs_cart_id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function buildTree(): Promise<CatNode[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;

  _promise = Promise.resolve(
    createClient()
      .from("categories")
      .select(
        "id, cs_cart_id, parent_cs_cart_id, name_uk, name_ru, slug, product_count, position",
      )
      .eq("status", "active")
      .order("position", { ascending: true }),
  ).then(({ data }) => {
    if (!data) return [];

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const clean = data.filter(
      (c: any) =>
        !HIDDEN.some((h) => c.name_uk.toLowerCase().trim().startsWith(h)),
    );

    const map = new Map<number, CatNode>();
    const roots: CatNode[] = [];

    for (const cat of clean) {
      map.set(cat.cs_cart_id, {
        ...cat,
        total_product_count: 0,
        children: [],
      } as CatNode);
    }

    for (const cat of clean) {
      const node = map.get(cat.cs_cart_id)!;
      if (!cat.parent_cs_cart_id || cat.parent_cs_cart_id === 0) {
        roots.push(node);
      } else if (map.has(cat.parent_cs_cart_id)) {
        map.get(cat.parent_cs_cart_id)!.children.push(node);
      }
    }

    // Keep only roots with position > 0 (removes CS-Cart duplicates)
    const hasPositioned = roots.some((r) => r.position > 0);
    const deduped = hasPositioned
      ? roots.filter((r) => r.position > 0)
      : roots;

    // Compute total product counts (self + all descendants)
    function computeTotals(nodes: CatNode[]): void {
      for (const n of nodes) {
        computeTotals(n.children);
        n.total_product_count =
          n.product_count +
          n.children.reduce((sum, c) => sum + c.total_product_count, 0);
      }
    }
    computeTotals(deduped);

    // Prune empty branches
    function prune(nodes: CatNode[]): CatNode[] {
      return nodes
        .map((n) => ({ ...n, children: prune(n.children) }))
        .filter((n) => n.total_product_count > 0 || n.children.length > 0);
    }

    const pruned = prune(deduped);

    // ── Build exact navbar order (like CS-Cart) ──
    // IDs: roots + promoted children in exact sequence
    const NAVBAR_ORDER = [
      385,  // Нігті
      374,  // Гель-лаки (child of 385)
      821,  // Бази (child of 385)
      822,  // Топи (child of 385)
      544,  // Догляд за обличчям
      640,  // Брови та вії (child of 544)
      567,  // Депіляція (child of 544)
      651,  // Інтер'єр/Меблі
      319,  // Техніка (child of 385)
      315,  // Одноразова продукція (child of 385)
      794,  // МініОпт
    ];

    const ordered: CatNode[] = [];

    // First: add nodes in exact navbar order
    for (const id of NAVBAR_ORDER) {
      // Search in pruned roots AND their children
      const node = findNode(pruned, id);
      if (node) ordered.push(node);
    }

    // Then: add remaining roots not in the order list
    for (const root of pruned) {
      if (!ordered.some((n) => n.cs_cart_id === root.cs_cart_id)) {
        ordered.push(root);
      }
    }

    _cache = ordered;
    return _cache;
  });

  return _promise;
}

export function useCategoryTree(): CatNode[] {
  const [tree, setTree] = useState<CatNode[]>(_cache ?? []);

  useEffect(() => {
    buildTree().then((t) => setTree(t));
  }, []);

  return tree;
}
