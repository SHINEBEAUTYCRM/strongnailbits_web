import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sanitize,
  getSearchVariants,
  buildTextOrFilter,
} from "@/utils/search-helpers";

/** Text fields to search products in */
const PRODUCT_FIELDS = ["name_uk", "name_ru", "sku", "description_uk"];

/** Text fields to search categories in */
const CATEGORY_FIELDS = ["name_uk", "name_ru"];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], categories: [], brands: [] });
  }

  const supabase = createAdminClient();
  const safeQ = sanitize(q);

  // Split into individual words (2+ chars each)
  const words = safeQ.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) words.push(safeQ);

  /* ── 1. Find matching brands (using transliterated variants) ── */
  // Build brand OR filter: for each word, search name by all variants
  const brandOrParts: string[] = [];
  for (const word of words) {
    const variants = getSearchVariants(word);
    for (const v of variants) {
      brandOrParts.push(`name.ilike.%${v}%`);
    }
  }

  const { data: allMatchingBrands } = await supabase
    .from("brands")
    .select("id, slug, name, logo_url")
    .or(brandOrParts.join(","));

  const matchingBrands = allMatchingBrands ?? [];

  /* ── 2. Products — multi-word AND, transliterated variants, brand-aware ── */
  let productQuery = supabase
    .from("products")
    .select(
      "id, slug, name_uk, price, old_price, main_image_url, sku, quantity, status, brand_id",
    )
    .eq("status", "active");

  for (const word of words) {
    const orParts = buildTextOrFilter(word, PRODUCT_FIELDS);

    // Also match by brand_id if any variant of this word matches a brand
    const variants = getSearchVariants(word);
    const wordBrandIds = matchingBrands
      .filter((b) =>
        variants.some((v) => b.name.toLowerCase().includes(v)),
      )
      .map((b) => b.id);

    if (wordBrandIds.length > 0) {
      orParts.push(`brand_id.in.(${wordBrandIds.join(",")})`);
    }

    productQuery = productQuery.or(orParts.join(","));
  }

  const productsPromise = productQuery
    .order("quantity", { ascending: false })
    .limit(8);

  /* ── 3. Categories — multi-word AND, transliterated variants ── */
  let catQuery = supabase
    .from("categories")
    .select("id, slug, name_uk, product_count")
    .eq("status", "active")
    .gt("product_count", 0);

  for (const word of words) {
    const orParts = buildTextOrFilter(word, CATEGORY_FIELDS);
    catQuery = catQuery.or(orParts.join(","));
  }

  const categoriesPromise = catQuery
    .order("product_count", { ascending: false })
    .limit(3);

  /* ── 4. Run all in parallel ── */
  const [productsRes, categoriesRes] = await Promise.all([
    productsPromise,
    categoriesPromise,
  ]);

  // Brands: return top 3 from the ones already fetched
  const brandResults = matchingBrands.slice(0, 3);

  return NextResponse.json({
    products: productsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    brands: brandResults,
  });
}
