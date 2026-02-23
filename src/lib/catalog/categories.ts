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

const NAIL_ROOT_CS_CART_ID = 385;

const HIDDEN_NAMES = [
  "удалить", "удалити", "видалити", "тест", "test", "temp", "tmp", "trash", "корзина", "ulka",
];

function isHidden(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return HIDDEN_NAMES.some((h) => lower === h || lower.startsWith(h + " ") || lower.startsWith(h + "_"));
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
    if (isHidden(cat.name_uk)) continue;
    const existing = byId.get(cat.cs_cart_id);
    if (!existing) {
      byId.set(cat.cs_cart_id, cat);
    } else if (existing.slug.endsWith("-ru") && !cat.slug.endsWith("-ru")) {
      byId.set(cat.cs_cart_id, cat);
    }
  }
  const cats = Array.from(byId.values());

  const nailRoot = cats.find((c) => c.cs_cart_id === NAIL_ROOT_CS_CART_ID);
  const nailRootId = nailRoot?.id;

  // Virtual roots: children of "Нігті" + real roots (depth 0) except "Нігті" itself
  const virtualRoots = cats.filter((c) => {
    if (c.parent_id === nailRootId) return true;
    if ((c.depth === 0 || c.depth === null) && c.cs_cart_id !== NAIL_ROOT_CS_CART_ID && (c.parent_cs_cart_id === null || c.parent_cs_cart_id === 0)) return true;
    return false;
  });

  const rootIds = new Set(virtualRoots.map((r) => r.id));

  function buildNode(cat: (typeof cats)[0]): CategoryNode {
    const children = cats
      .filter((c) => c.parent_id === cat.id && !rootIds.has(c.id))
      .map(buildNode);

    const totalProducts = (cat.product_count || 0) + children.reduce((s, c) => s + c.total_product_count, 0);

    return {
      id: cat.id,
      name_uk: cat.name_uk,
      name_ru: cat.name_ru,
      slug: cat.slug,
      image_url: cat.image_url,
      product_count: cat.product_count || 0,
      total_product_count: totalProducts,
      depth: cat.depth ?? 0,
      parent_id: cat.parent_id,
      cs_cart_id: cat.cs_cart_id,
      children,
    };
  }

  return virtualRoots
    .map(buildNode)
    .filter((n) => n.total_product_count > 0 || n.children.length > 0);
}

export const getCatalogCategoryTree = unstable_cache(
  _getCatalogCategoryTree,
  ["catalog-category-tree"],
  { revalidate: 300 },
);
