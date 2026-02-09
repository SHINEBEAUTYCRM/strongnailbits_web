import { createAdminClient } from "@/lib/supabase/admin";

export interface CategoryNode {
  id: string;
  slug: string;
  name_uk: string;
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

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const supabase = createAdminClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name_uk, cs_cart_id, parent_cs_cart_id, position, product_count")
    .eq("status", "active")
    .order("position", { ascending: true });

  if (!categories) return [];

  // Filter out blacklisted names
  const clean = categories.filter((cat) => !isHidden(cat.name_uk));

  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of clean) {
    map.set(cat.cs_cart_id, { ...cat, total_product_count: 0, children: [] });
  }

  for (const cat of clean) {
    const node = map.get(cat.cs_cart_id)!;

    if (cat.parent_cs_cart_id === null || cat.parent_cs_cart_id === 0) {
      // True root — parent_id was 0 in CS-Cart
      roots.push(node);
    } else if (map.has(cat.parent_cs_cart_id)) {
      // Valid parent exists in the active set
      map.get(cat.parent_cs_cart_id)!.children.push(node);
    }
    // else: orphan — parent is disabled/hidden → silently drop
  }

  /* ------------------------------------------------------------------ */
  /* Deduplicate roots: CS-Cart may have a second storefront whose       */
  /* root categories (parent_id=0, position=0) duplicate categories      */
  /* from the main store. Keep only roots with position > 0 when both    */
  /* positioned and unpositioned roots exist.                             */
  /* ------------------------------------------------------------------ */

  const hasPositionedRoots = roots.some((r) => r.position > 0);
  const deduped = hasPositionedRoots
    ? roots.filter((r) => r.position > 0)
    : roots;

  // Compute total product counts (including descendants)
  computeTotals(deduped);

  return pruneEmpty(deduped);
}
