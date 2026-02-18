import { createAdminClient } from "@/lib/supabase/admin";
import { SidebarTree } from "./SidebarTree";

interface CategoryNode {
  id: string;
  slug: string;
  name_uk: string;
  cs_cart_id: number;
  parent_cs_cart_id: number | null;
  product_count: number;
  children: CategoryNode[];
}

/**
 * Recursively prune categories that have product_count = 0
 * AND have no children with products. Parents with product_count = 0
 * are kept as groups if they have children with products.
 */
function pruneEmpty(nodes: CategoryNode[]): CategoryNode[] {
  return nodes
    .map((node) => ({ ...node, children: pruneEmpty(node.children) }))
    .filter((node) => node.product_count > 0 || node.children.length > 0);
}

async function getCategoryTree(): Promise<CategoryNode[]> {
  const supabase = createAdminClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name_uk, cs_cart_id, parent_cs_cart_id, product_count")
    .eq("status", "active")
    .order("position", { ascending: true });

  if (!categories) return [];

  // Build tree
  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  // First pass: create nodes
  for (const cat of categories) {
    map.set(cat.cs_cart_id, { ...cat, children: [] });
  }

  // Second pass: build hierarchy
  for (const cat of categories) {
    const node = map.get(cat.cs_cart_id)!;
    if (cat.parent_cs_cart_id && map.has(cat.parent_cs_cart_id)) {
      map.get(cat.parent_cs_cart_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Remove categories with no products and no children with products
  return pruneEmpty(roots);
}

interface CategorySidebarProps {
  currentSlug?: string;
}

export async function CategorySidebar({ currentSlug }: CategorySidebarProps) {
  const tree = await getCategoryTree();

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
        Категорії
      </h3>
      <SidebarTree tree={tree} currentSlug={currentSlug} />
    </div>
  );
}
