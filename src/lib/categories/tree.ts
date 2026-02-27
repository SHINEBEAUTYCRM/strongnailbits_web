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
  total_product_count: number;
  children: CategoryNode[];
}

function computeTotals(nodes: CategoryNode[]): void {
  for (const node of nodes) {
    computeTotals(node.children);
    node.total_product_count =
      node.product_count +
      node.children.reduce((sum, c) => sum + c.total_product_count, 0);
  }
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
  const rows = Array.from(byId.values());

  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of rows) {
    map.set(cat.cs_cart_id, { ...cat, total_product_count: 0, children: [] });
  }

  for (const cat of rows) {
    const node = map.get(cat.cs_cart_id)!;
    if (cat.parent_cs_cart_id === null || cat.parent_cs_cart_id === 0) {
      roots.push(node);
    } else if (map.has(cat.parent_cs_cart_id)) {
      map.get(cat.parent_cs_cart_id)!.children.push(node);
    }
  }

  computeTotals(roots);
  return roots;
}

export const getCategoryTree = unstable_cache(
  _fetchCategoryTree,
  ["category-tree"],
  { revalidate: 300 },
);
