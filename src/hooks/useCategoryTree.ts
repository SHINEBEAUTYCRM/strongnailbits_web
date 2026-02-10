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

const HIDDEN = ["удалить", "удалити", "видалити", "тест", "test", "temp", "tmp", "trash", "ulka"];

/* ─── module-level cache (shared across all components) ─── */
let _cache: CatNode[] | null = null;
let _promise: Promise<CatNode[]> | null = null;

function buildTree(): Promise<CatNode[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;

  _promise = Promise.resolve(
    createClient()
      .from("categories")
      .select("id, cs_cart_id, parent_cs_cart_id, name_uk, name_ru, slug, product_count, position")
      .eq("status", "active")
      .order("position", { ascending: true }),
  ).then(({ data }) => {
      if (!data) return [];

      // Filter hidden names
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clean = data.filter(
        (c: any) => !HIDDEN.some((h) => c.name_uk.toLowerCase().trim().startsWith(h)),
      );

      const map = new Map<number, CatNode>();
      const roots: CatNode[] = [];

      for (const cat of clean) {
        map.set(cat.cs_cart_id, { ...cat, total_product_count: 0, children: [] } as CatNode);
      }

      for (const cat of clean) {
        const node = map.get(cat.cs_cart_id)!;
        if (!cat.parent_cs_cart_id || cat.parent_cs_cart_id === 0) {
          roots.push(node);
        } else if (map.has(cat.parent_cs_cart_id)) {
          map.get(cat.parent_cs_cart_id)!.children.push(node);
        }
      }

      // Remove duplicates (CS-Cart second storefront)
      const hasPositioned = roots.some((r) => r.position > 0);
      const deduped = hasPositioned ? roots.filter((r) => r.position > 0) : roots;

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

      _cache = prune(deduped);
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
