import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";

export interface CategoryNode {
  id: string;
  name_uk: string;
  name_ru: string | null;
  slug: string;
  image_url: string | null;
  product_count: number;
  total_product_count: number;
  depth: number;
  parent_id: string | null;
  cs_cart_id: number;
  children: CategoryNode[];
}

async function _getCatalogCategoryTree(): Promise<CategoryNode[]> {
  const supabase = createAdminClient();

  const { data: allCats } = await supabase
    .from("categories")
    .select("id, name_uk, name_ru, slug, image_url, product_count, depth, parent_id, parent_cs_cart_id, cs_cart_id, position")
    .eq("status", "active")
    .order("position", { ascending: true });

  if (!allCats) return [];

  // Deduplicate by cs_cart_id — prefer Ukrainian slug (no "-ru")
  const byId = new Map<number, (typeof allCats)[0]>();
  for (const cat of allCats) {
    const existing = byId.get(cat.cs_cart_id);
    if (!existing) {
      byId.set(cat.cs_cart_id, cat);
    } else if (existing.slug.endsWith("-ru") && !cat.slug.endsWith("-ru")) {
      byId.set(cat.cs_cart_id, cat);
    }
  }
  const cats = Array.from(byId.values());

  // Build full tree as-is from DB hierarchy
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const cat of cats) {
    map.set(cat.id, {
      id: cat.id,
      name_uk: cat.name_uk,
      name_ru: cat.name_ru,
      slug: cat.slug,
      image_url: cat.image_url,
      product_count: cat.product_count || 0,
      total_product_count: 0,
      depth: cat.depth ?? 0,
      parent_id: cat.parent_id,
      cs_cart_id: cat.cs_cart_id,
      children: [],
    });
  }

  for (const cat of cats) {
    const node = map.get(cat.id)!;
    if (!cat.parent_id || !map.has(cat.parent_id)) {
      roots.push(node);
    } else {
      map.get(cat.parent_id)!.children.push(node);
    }
  }

  function computeTotals(nodes: CategoryNode[]): void {
    for (const n of nodes) {
      computeTotals(n.children);
      n.total_product_count =
        n.product_count + n.children.reduce((s, c) => s + c.total_product_count, 0);
    }
  }
  computeTotals(roots);

  return roots;
}

export const getCatalogCategoryTree = unstable_cache(
  _getCatalogCategoryTree,
  ["catalog-category-tree"],
  { revalidate: 300 },
);
