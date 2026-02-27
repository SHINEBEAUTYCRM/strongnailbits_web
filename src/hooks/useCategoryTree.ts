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

let _cache: CatNode[] | null = null;
let _promise: Promise<CatNode[]> | null = null;

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

    // Deduplicate by cs_cart_id: prefer slug without "-ru" suffix
    const byId = new Map<number, (typeof data)[0]>();
    for (const cat of data) {
      const existing = byId.get(cat.cs_cart_id);
      if (!existing) {
        byId.set(cat.cs_cart_id, cat);
      } else if (existing.slug.endsWith("-ru") && !cat.slug.endsWith("-ru")) {
        byId.set(cat.cs_cart_id, cat);
      }
    }
    const rows = Array.from(byId.values());

    const map = new Map<number, CatNode>();
    const roots: CatNode[] = [];

    for (const cat of rows) {
      map.set(cat.cs_cart_id, {
        ...cat,
        total_product_count: 0,
        children: [],
      } as CatNode);
    }

    for (const cat of rows) {
      const node = map.get(cat.cs_cart_id)!;
      if (!cat.parent_cs_cart_id || cat.parent_cs_cart_id === 0) {
        roots.push(node);
      } else if (map.has(cat.parent_cs_cart_id)) {
        map.get(cat.parent_cs_cart_id)!.children.push(node);
      }
    }

    function computeTotals(nodes: CatNode[]): void {
      for (const n of nodes) {
        computeTotals(n.children);
        n.total_product_count =
          n.product_count +
          n.children.reduce((sum, c) => sum + c.total_product_count, 0);
      }
    }
    computeTotals(roots);

    _cache = roots;
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
