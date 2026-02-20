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
  include_in_menu: boolean;
  menu_position: number;
  children: CatNode[];
}

const HIDDEN = [
  "удалить",
  "удалити",
  "видалити",
  "тест",
  "test",
  "temp",
  "tmp",
  "trash",
];

let _cache: CatNode[] | null = null;
let _promise: Promise<CatNode[]> | null = null;

function buildTree(): Promise<CatNode[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;

  _promise = Promise.resolve(
    createClient()
      .from("categories")
      .select(
        "id, cs_cart_id, parent_cs_cart_id, name_uk, name_ru, slug, product_count, position, include_in_menu, menu_position",
      )
      .eq("status", "active")
      .order("position", { ascending: true }),
  ).then(({ data }) => {
    if (!data) return [];

    const clean = data.filter(
      (c: any) =>
        !HIDDEN.some((h) =>
          (c.name_uk || "").toLowerCase().trim().startsWith(h),
        ),
    );

    const map = new Map<number, CatNode>();

    for (const cat of clean) {
      map.set(cat.cs_cart_id, {
        ...cat,
        include_in_menu: cat.include_in_menu ?? false,
        menu_position: cat.menu_position ?? 0,
        total_product_count: 0,
        children: [],
      } as CatNode);
    }

    for (const cat of clean) {
      const node = map.get(cat.cs_cart_id)!;
      if (cat.parent_cs_cart_id && map.has(cat.parent_cs_cart_id)) {
        map.get(cat.parent_cs_cart_id)!.children.push(node);
      }
    }

    function computeTotals(node: CatNode): number {
      let total = node.product_count || 0;
      for (const child of node.children) {
        total += computeTotals(child);
      }
      node.total_product_count = total;
      return total;
    }

    for (const node of map.values()) {
      const cat = clean.find((c: any) => c.cs_cart_id === node.cs_cart_id);
      if (!cat?.parent_cs_cart_id || !map.has(cat.parent_cs_cart_id)) {
        computeTotals(node);
      }
    }

    const navbar: CatNode[] = [];
    for (const node of map.values()) {
      if (node.include_in_menu && node.menu_position > 0) {
        navbar.push(node);
      }
    }
    navbar.sort((a, b) => a.menu_position - b.menu_position);

    _cache = navbar;
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
