import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";

export interface CategoryNode {
  id: string;
  slug: string;
  name_uk: string;
  name_ru: string | null;
  cs_cart_id: number;
  parent_cs_cart_id: number | null;
  position: number;
  product_count: number;
  /** Total products in this category and all descendants */
  total_product_count: number;
  children: CategoryNode[];
}

/** Names to always exclude from display */
const HIDDEN_NAMES = [
  "удалить", "удалити", "видалити", "тест", "test", "temp", "tmp", "trash", "корзина",
  "ulka",  // brand miscategorized as root category in CS-Cart
];

function isHidden(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return HIDDEN_NAMES.some(
    (h) => lower === h || lower.startsWith(h + " ") || lower.startsWith(h + "_"),
  );
}

/** Recursively compute total_product_count (self + all descendants) */
function computeTotals(nodes: CategoryNode[]): void {
  for (const node of nodes) {
    computeTotals(node.children);
    node.total_product_count =
      node.product_count +
      node.children.reduce((sum, c) => sum + c.total_product_count, 0);
  }
}

function pruneEmpty(nodes: CategoryNode[]): CategoryNode[] {
  return nodes
    .map((n) => ({ ...n, children: pruneEmpty(n.children) }))
    .filter((n) => n.total_product_count > 0 || n.children.length > 0);
}

async function _fetchCategoryTree(): Promise<CategoryNode[]> {
  const supabase = createAdminClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name_uk, name_ru, cs_cart_id, parent_cs_cart_id, position, product_count")
    .eq("status", "active")
    .order("position", { ascending: true });

  if (!categories) return [];

  // Deduplicate by cs_cart_id: prefer slug without "-ru" suffix
  const byId = new Map<number, (typeof categories)[0]>();
  for (const cat of categories) {
    const existing = byId.get(cat.cs_cart_id);
    if (!existing) {
      byId.set(cat.cs_cart_id, cat);
    } else if (existing.slug.endsWith("-ru") && !cat.slug.endsWith("-ru")) {
      byId.set(cat.cs_cart_id, cat);
    }
  }
  const deduplicatedRows = Array.from(byId.values());

  const clean = deduplicatedRows.filter((cat) => !isHidden(cat.name_uk));

  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of clean) {
    map.set(cat.cs_cart_id, { ...cat, total_product_count: 0, children: [] });
  }

  for (const cat of clean) {
    const node = map.get(cat.cs_cart_id)!;
    if (cat.parent_cs_cart_id === null || cat.parent_cs_cart_id === 0) {
      roots.push(node);
    } else if (map.has(cat.parent_cs_cart_id)) {
      map.get(cat.parent_cs_cart_id)!.children.push(node);
    }
  }

  const hasPositionedRoots = roots.some((r) => r.position > 0);
  const deduped = hasPositionedRoots
    ? roots.filter((r) => r.position > 0)
    : roots;

  computeTotals(deduped);
  return pruneEmpty(deduped);
}

/**
 * Cached category tree — revalidates every 5 minutes.
 * This avoids hitting Supabase on every page render for
 * homepage sidebar, catalog, header menu, etc.
 */
export const getCategoryTree = unstable_cache(
  _fetchCategoryTree,
  ["category-tree"],
  { revalidate: 300 }, // 5 minutes
);
