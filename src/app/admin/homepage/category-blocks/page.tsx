import { createAdminClient } from "@/lib/supabase/admin";
import { CategoryBlocksClient } from "./CategoryBlocksClient";

export default async function CategoryBlocksPage() {
  const supabase = createAdminClient();

  const [{ data: blocks }, { data: categories }] = await Promise.all([
    supabase
      .from("home_category_blocks")
      .select("*, categories(id, name_uk, slug, image_url, cs_cart_id)")
      .order("sort_order"),
    supabase
      .from("categories")
      .select("id, name_uk, cs_cart_id, parent_cs_cart_id, product_count")
      .eq("status", "active")
      .order("name_uk"),
  ]);

  const parentCsCartIds = new Set(
    (categories || [])
      .filter((c) => c.parent_cs_cart_id)
      .map((c) => c.parent_cs_cart_id)
  );
  const parentCategories = (categories || []).filter(
    (c) => parentCsCartIds.has(c.cs_cart_id)
  );

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--a-text)" }}>
        Блоки категорій на головній
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--a-text-4)" }}>
        Amazon-style сітка 2×2 підкатегорій. Кожен блок показує батьківську категорію та 4 дочірні з картинками.
      </p>
      <CategoryBlocksClient
        initialBlocks={blocks || []}
        parentCategories={parentCategories}
      />
    </div>
  );
}
