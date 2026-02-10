import { createAdminClient } from "@/lib/supabase/admin";
import type { BrandFilterItem } from "@/components/catalog/Filters";

/* ------------------------------------------------------------------ */
/*  Sort map                                                           */
/* ------------------------------------------------------------------ */

export type SortValue =
  | "popular"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "newest"
  | "discount";

interface SortDef {
  column: string;
  ascending: boolean;
}

const SORT_MAP: Record<SortValue, SortDef> = {
  popular: { column: "position", ascending: true },
  price_asc: { column: "price", ascending: true },
  price_desc: { column: "price", ascending: false },
  name_asc: { column: "name_uk", ascending: true },
  name_desc: { column: "name_uk", ascending: false },
  newest: { column: "created_at", ascending: false },
  discount: { column: "old_price", ascending: false },
};

/* ------------------------------------------------------------------ */
/*  Parsed search params                                               */
/* ------------------------------------------------------------------ */

export interface CatalogFilters {
  page: number;
  sort: SortValue;
  priceMin: number | null;
  priceMax: number | null;
  brandSlugs: string[];
  inStock: boolean;
  view: "grid" | "list";
}

export function parseSearchParams(
  sp: Record<string, string | undefined>,
): CatalogFilters {
  return {
    page: Math.max(1, parseInt(sp.page ?? "1", 10)),
    sort: (SORT_MAP[sp.sort as SortValue] ? sp.sort : "popular") as SortValue,
    priceMin: sp.price_min ? Number(sp.price_min) : null,
    priceMax: sp.price_max ? Number(sp.price_max) : null,
    brandSlugs: sp.brands ? sp.brands.split(",").filter(Boolean) : [],
    inStock: sp.in_stock === "true",
    view: sp.view === "list" ? "list" : "grid",
  };
}

/* ------------------------------------------------------------------ */
/*  Get all descendant category UUIDs (including self)                 */
/* ------------------------------------------------------------------ */

export interface ChildCategoryInfo {
  id: string;
  slug: string;
  name_uk: string;
}

export interface CategoryScopeData {
  /** UUIDs of category + all descendants (for product queries) */
  descendantIds: string[];
  /** Direct children for sidebar / mobile pills */
  children: ChildCategoryInfo[];
}

/**
 * Given a category's cs_cart_id, fetches all active categories once
 * and returns:
 *  - descendantIds: UUID[] of self + all recursive children
 *  - children: direct children (pruned: only those with products in subtree)
 */
export async function getCategoryScopeData(
  csCartId: number,
): Promise<CategoryScopeData> {
  const supabase = createAdminClient();
  const { data: allCats } = await supabase
    .from("categories")
    .select("id, cs_cart_id, parent_cs_cart_id, name_uk, name_ru, slug, product_count, position")
    .eq("status", "active")
    .order("position", { ascending: true });

  if (!allCats) return { descendantIds: [], children: [] };

  // Build maps
  const byParent = new Map<number, typeof allCats>();
  const idMap = new Map<number, string>(); // cs_cart_id → uuid
  const catMap = new Map<number, (typeof allCats)[0]>();

  for (const cat of allCats) {
    idMap.set(cat.cs_cart_id, cat.id);
    catMap.set(cat.cs_cart_id, cat);
    const parent = cat.parent_cs_cart_id ?? 0;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(cat);
  }

  // BFS: collect all descendant UUIDs (including self)
  const descendantIds: string[] = [];
  const queue = [csCartId];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const uuid = idMap.get(current);
    if (uuid) descendantIds.push(uuid);

    const kids = byParent.get(current) ?? [];
    for (const kid of kids) {
      queue.push(kid.cs_cart_id);
    }
  }

  // Direct children for sidebar
  const directChildren = byParent.get(csCartId) ?? [];

  // Recursive check: does this category have any products in its subtree?
  function hasProductsInSubtree(catCsCartId: number, seen = new Set<number>()): boolean {
    if (seen.has(catCsCartId)) return false;
    seen.add(catCsCartId);
    const cat = catMap.get(catCsCartId);
    if (!cat) return false;
    if (cat.product_count > 0) return true;
    const kids = byParent.get(catCsCartId) ?? [];
    return kids.some((k) => hasProductsInSubtree(k.cs_cart_id, seen));
  }

  const children: ChildCategoryInfo[] = directChildren
    .filter((c) => hasProductsInSubtree(c.cs_cart_id))
    .map((c) => ({ id: c.id, slug: c.slug, name_uk: c.name_uk }));

  return { descendantIds, children };
}

/* ------------------------------------------------------------------ */
/*  Fetch filtered products                                            */
/* ------------------------------------------------------------------ */

interface FetchProductsOpts {
  /** Array of category UUIDs to include (self + descendants) */
  categoryIds?: string[];
  filters: CatalogFilters;
  perPage: number;
}

export async function fetchFilteredProducts({
  categoryIds,
  filters,
  perPage,
}: FetchProductsOpts) {
  const supabase = createAdminClient();
  const offset = (filters.page - 1) * perPage;

  // Resolve brand slugs → UUIDs
  let brandIds: string[] | null = null;
  if (filters.brandSlugs.length > 0) {
    const { data: brandRows } = await supabase
      .from("brands")
      .select("id")
      .in("slug", filters.brandSlugs);
    brandIds = brandRows?.map((b) => b.id) ?? [];
    if (brandIds.length === 0) {
      return { products: [], total: 0 };
    }
  }

  const sortDef = SORT_MAP[filters.sort];
  const COLUMNS =
    "id, slug, name_uk, name_ru, price, old_price, main_image_url, status, quantity, is_new, is_featured, brand_id, brands!products_brand_id_fkey(name)";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Q = any;

  /** Apply shared filters (category, price, brand, discount) */
  function applyFilters(q: Q): Q {
    let f = q.eq("status", "active");
    if (categoryIds && categoryIds.length > 0)
      f = f.in("category_id", categoryIds);
    if (filters.priceMin !== null && filters.priceMin > 0)
      f = f.gte("price", filters.priceMin);
    if (filters.priceMax !== null && filters.priceMax > 0)
      f = f.lte("price", filters.priceMax);
    if (brandIds) f = f.in("brand_id", brandIds);
    if (filters.sort === "discount") f = f.gt("old_price", 0);
    return f;
  }

  // ── If user explicitly filters in-stock only — single query ──
  if (filters.inStock) {
    const { data, count } = await applyFilters(
      supabase.from("products").select(COLUMNS, { count: "exact" }),
    )
      .gt("quantity", 0)
      .order(sortDef.column, { ascending: sortDef.ascending })
      .range(offset, offset + perPage - 1);
    return { products: data ?? [], total: count ?? 0 };
  }

  // ── Two-pass: in-stock first, out-of-stock at the bottom ──

  // 1+2) Count in-stock and out-of-stock in parallel
  const [{ count: rawInStock }, { count: rawOutOfStock }] = await Promise.all([
    applyFilters(
      supabase.from("products").select("id", { count: "exact", head: true }),
    ).gt("quantity", 0),
    applyFilters(
      supabase.from("products").select("id", { count: "exact", head: true }),
    ).lte("quantity", 0),
  ]);
  const inStockCount = rawInStock ?? 0;
  const outOfStockCount = rawOutOfStock ?? 0;

  const totalAll = inStockCount + outOfStockCount;

  // 3) Fetch the right slice for this page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products: any[] = [];

  if (offset < inStockCount) {
    // Page starts in in-stock territory
    const inFrom = offset;
    const inTo = Math.min(offset + perPage - 1, inStockCount - 1);
    const { data: inData } = await applyFilters(
      supabase.from("products").select(COLUMNS),
    )
      .gt("quantity", 0)
      .order(sortDef.column, { ascending: sortDef.ascending })
      .range(inFrom, inTo);
    products.push(...(inData ?? []));

    // If page spans the boundary, also fetch start of out-of-stock
    if (products.length < perPage && outOfStockCount > 0) {
      const remaining = perPage - products.length;
      const { data: outData } = await applyFilters(
        supabase.from("products").select(COLUMNS),
      )
        .lte("quantity", 0)
        .order(sortDef.column, { ascending: sortDef.ascending })
        .range(0, remaining - 1);
      products.push(...(outData ?? []));
    }
  } else if (outOfStockCount > 0) {
    // Page is entirely in out-of-stock territory
    const outFrom = offset - inStockCount;
    const outTo = outFrom + perPage - 1;
    const { data: outData } = await applyFilters(
      supabase.from("products").select(COLUMNS),
    )
      .lte("quantity", 0)
      .order(sortDef.column, { ascending: sortDef.ascending })
      .range(outFrom, outTo);
    products.push(...(outData ?? []));
  }

  return { products, total: totalAll };
}

/* ------------------------------------------------------------------ */
/*  Fetch brands with product counts for a given scope                 */
/* ------------------------------------------------------------------ */

export async function fetchBrandsForFilter(
  categoryIds?: string[],
): Promise<{ brands: BrandFilterItem[]; minPrice: number; maxPrice: number }> {
  const supabase = createAdminClient();

  // ── Parallel: price range + brand_id list (only 2 small columns) ──
  const priceQuery = supabase
    .from("products")
    .select("price")
    .eq("status", "active")
    .gt("price", 0)
    .order("price", { ascending: true })
    .limit(1);

  const priceQueryMax = supabase
    .from("products")
    .select("price")
    .eq("status", "active")
    .gt("price", 0)
    .order("price", { ascending: false })
    .limit(1);

  let brandQuery = supabase
    .from("products")
    .select("brand_id")
    .eq("status", "active")
    .not("brand_id", "is", null);

  if (categoryIds && categoryIds.length > 0) {
    brandQuery = brandQuery.in("category_id", categoryIds);
  }

  // Apply category filter to price queries too
  let pqMin = priceQuery;
  let pqMax = priceQueryMax;
  if (categoryIds && categoryIds.length > 0) {
    pqMin = pqMin.in("category_id", categoryIds);
    pqMax = pqMax.in("category_id", categoryIds);
  }

  const [minRes, maxRes, brandRes] = await Promise.all([
    pqMin,
    pqMax,
    brandQuery,
  ]);

  const minPrice = minRes.data?.[0]?.price ? Math.floor(Number(minRes.data[0].price)) : 0;
  const maxPrice = maxRes.data?.[0]?.price ? Math.ceil(Number(maxRes.data[0].price)) : 0;

  const brandRows = brandRes.data ?? [];
  if (brandRows.length === 0) {
    return { brands: [], minPrice, maxPrice };
  }

  // Count brands in JS (still faster than loading full products)
  const brandCounts = new Map<string, number>();
  for (const p of brandRows) {
    brandCounts.set(p.brand_id, (brandCounts.get(p.brand_id) ?? 0) + 1);
  }

  // Fetch brand names for the unique brand IDs found
  const { data: brandNameRows } = await supabase
    .from("brands")
    .select("id, slug, name")
    .in("id", [...brandCounts.keys()])
    .order("name", { ascending: true });

  const brands: BrandFilterItem[] = (brandNameRows ?? []).map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    count: brandCounts.get(b.id) ?? 0,
  }));

  brands.sort((a, b) => b.count - a.count);

  return { brands, minPrice, maxPrice };
}

/* ------------------------------------------------------------------ */
/*  Build pagination URL preserving filters                            */
/* ------------------------------------------------------------------ */

export function buildFilteredUrl(
  basePath: string,
  filters: CatalogFilters,
  overrides: Partial<CatalogFilters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.sort !== "popular") params.set("sort", merged.sort);
  if (merged.priceMin !== null && merged.priceMin > 0)
    params.set("price_min", String(merged.priceMin));
  if (merged.priceMax !== null && merged.priceMax > 0)
    params.set("price_max", String(merged.priceMax));
  if (merged.brandSlugs.length > 0)
    params.set("brands", merged.brandSlugs.join(","));
  if (merged.inStock) params.set("in_stock", "true");
  if (merged.view === "list") params.set("view", "list");

  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}
