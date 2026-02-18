/* ------------------------------------------------------------------ */
/*  CS-Cart Multilang Preprocessor — CLIENT-SIDE                      */
/*  Hardcoded column indices based on real CS-Cart export format      */
/* ------------------------------------------------------------------ */

export interface CSCartMergedProduct {
  sku: string;
  cs_cart_id: number | null;
  name_ru: string;
  name_uk: string;
  description_ru: string;
  description_uk: string;
  category_path_ru: string;
  category_path_uk: string;
  categories: string[];
  brand_guess: string;
  thumbnail_url: string;
  image_urls: string[];
  image_local_path: string;
  matched_product_id: string | null;
  matched_product_name: string | null;
  match_status: "matched" | "not_found" | "pending";
}

export interface CSCartPreprocessResult {
  products: CSCartMergedProduct[];
  stats: {
    total_rows: number;
    total_products: number;
    with_description_uk: number;
    with_description_ru: number;
    with_photos: number;
    unique_categories: number;
    skipped_no_sku: number;
    single_lang_only: number;
    brands: Array<{ name: string; count: number }>;
    top_categories: Array<{ name: string; count: number }>;
  };
  errors: Array<{ row: number; error: string }>;
}

// Hardcoded column indices — verified against real CS-Cart export
const COL = {
  SKU: 0,
  LANG: 1,
  DESCRIPTION: 2,
  CS_CART_ID: 3,
  NAME: 4,
  CATEGORY: 5,
  EXTRA: 6,
  IMAGE_PATH: 7,
  THUMBNAIL: 8,
  IMAGES: 9,
} as const;

// Known brands for matching
const KNOWN_BRANDS = [
  "DARK", "LUNA", "WEEX", "GA&MA", "Ga&Ma", "F.O.X", "FOX",
  "Siller", "DNKa", "NUB", "Staleks", "EDLEN", "Saga",
  "DEZIK", "HEYLOVE", "Micro-NX", "Kodi", "Oxxi", "GGA",
  "Canni", "Naomi", "My Nail", "Couture", "Milano", "Moon",
  "PNB", "Adore", "Nails Of The Day", "NOTD", "Starlet",
  "Komilfo", "Kira Nails", "BUCOS", "Jeken", "ELAN",
];

function cellStr(row: unknown[], index: number): string {
  if (!row || index >= row.length) return "";
  const val = row[index];
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function cellNum(row: unknown[], index: number): number | null {
  const str = cellStr(row, index);
  if (!str) return null;
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

function parseTripleSlash(value: string): string[] {
  if (!value) return [];
  return value.split("///").map((s) => s.trim()).filter(Boolean);
}

function sanitizeHTML(html: string): string {
  if (!html || typeof document === "undefined") return html || "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, iframe, object, embed, form, input, textarea, select, button").forEach((el) => el.remove());
    doc.querySelectorAll("*").forEach((el) => {
      const attrs = [...el.attributes];
      for (const attr of attrs) {
        if (attr.name.startsWith("on") || attr.name === "srcdoc") {
          el.removeAttribute(attr.name);
        }
      }
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

function guessBrand(name: string, category: string): string {
  const combined = `${name} ${category}`.toLowerCase();
  for (const brand of KNOWN_BRANDS) {
    if (combined.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  const firstWord = name.split(" ")[0];
  if (firstWord && firstWord.length > 1 && firstWord === firstWord.toUpperCase() && /^[A-ZА-ЯІЇЄҐ]/.test(firstWord)) {
    return firstWord;
  }
  return "Інше";
}

/**
 * Verify that a description actually belongs to the product name.
 * Returns 'ok' | 'warning' | 'error'
 */
export function verifyDescriptionMatch(name: string, description: string): "ok" | "warning" | "error" {
  if (!description || description.length < 20) return "ok";

  const nameWords = name
    .toLowerCase()
    .replace(/[^\wа-яіїєґ\s]/gi, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const descLower = description.toLowerCase();

  const firstWords = nameWords.slice(0, 4);
  if (firstWords.length === 0) return "ok";

  const matchCount = firstWords.filter((w) => descLower.includes(w)).length;

  if (matchCount >= 2) return "ok";
  if (matchCount === 1) return "warning";
  return "error";
}

/**
 * Merge CS-Cart multilang rows into unified product objects.
 * Uses hardcoded column indices.
 */
export function mergeCSCartMultilangRows(rows: unknown[][]): CSCartPreprocessResult {
  const products: CSCartMergedProduct[] = [];
  const errors: Array<{ row: number; error: string }> = [];
  const categorySet = new Set<string>();
  const brandCounts = new Map<string, number>();
  const topCategoryCounts = new Map<string, number>();

  let skippedNoSku = 0;
  let singleLangOnly = 0;

  let i = 0;

  // Skip header row if present
  if (rows.length > 0) {
    const firstLang = cellStr(rows[0], COL.LANG).toLowerCase();
    if (firstLang !== "ru" && firstLang !== "uk") {
      i = 1;
    }
  }

  while (i < rows.length) {
    const row = rows[i];
    if (!row) { i++; continue; }

    const lang = cellStr(row, COL.LANG).toLowerCase();

    if (lang === "ru") {
      const sku = cellStr(row, COL.SKU);
      const csCartId = cellNum(row, COL.CS_CART_ID);
      const nameRu = cellStr(row, COL.NAME);
      const descRu = cellStr(row, COL.DESCRIPTION);
      const categoryRu = cellStr(row, COL.CATEGORY);
      const imagePath = cellStr(row, COL.IMAGE_PATH);
      const thumbnail = cellStr(row, COL.THUMBNAIL);
      const imagesRaw = cellStr(row, COL.IMAGES);

      let nameUk = nameRu;
      let descUk = "";
      let categoryUk = categoryRu;
      let thumbnailUk = thumbnail;
      let imagesUk = imagesRaw;

      // Check next row — only if it's the uk pair for this product
      if (i + 1 < rows.length) {
        const nextRow = rows[i + 1];
        const nextLang = cellStr(nextRow, COL.LANG).toLowerCase();
        const nextSku = cellStr(nextRow, COL.SKU);

        if (nextLang === "uk" && (!nextSku || nextSku === sku) && !cellNum(nextRow, COL.CS_CART_ID)) {
          nameUk = cellStr(nextRow, COL.NAME) || nameRu;
          descUk = cellStr(nextRow, COL.DESCRIPTION);
          categoryUk = cellStr(nextRow, COL.CATEGORY) || categoryRu;
          thumbnailUk = cellStr(nextRow, COL.THUMBNAIL) || thumbnail;
          imagesUk = cellStr(nextRow, COL.IMAGES) || imagesRaw;
          i += 2;
        } else {
          singleLangOnly++;
          i += 1;
        }
      } else {
        singleLangOnly++;
        i += 1;
      }

      if (!sku && !csCartId) {
        skippedNoSku++;
        errors.push({ row: i - 1, error: "Порожній SKU і cs_cart_id" });
        continue;
      }

      const finalName = nameUk || nameRu;
      const finalCategory = categoryUk || categoryRu;
      const categories = parseTripleSlash(finalCategory);
      categories.forEach((c) => categorySet.add(c));

      if (categories.length > 0) {
        const topCat = categories[0];
        topCategoryCounts.set(topCat, (topCategoryCounts.get(topCat) ?? 0) + 1);
      }

      const brand = guessBrand(finalName, finalCategory);
      brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);

      products.push({
        sku: sku || String(csCartId),
        cs_cart_id: csCartId,
        name_ru: nameRu,
        name_uk: nameUk,
        description_ru: descRu ? sanitizeHTML(descRu) : "",
        description_uk: descUk ? sanitizeHTML(descUk) : "",
        category_path_ru: categoryRu,
        category_path_uk: categoryUk,
        categories,
        brand_guess: brand,
        thumbnail_url: thumbnailUk || thumbnail,
        image_urls: parseTripleSlash(imagesUk || imagesRaw),
        image_local_path: imagePath,
        matched_product_id: null,
        matched_product_name: null,
        match_status: "pending",
      });
    } else if (lang === "uk") {
      // Standalone uk row (no preceding ru)
      const sku = cellStr(row, COL.SKU);
      const csCartId = cellNum(row, COL.CS_CART_ID);
      if (sku || csCartId) {
        singleLangOnly++;
        const nameUk = cellStr(row, COL.NAME);
        const categoryUk = cellStr(row, COL.CATEGORY);
        const categories = parseTripleSlash(categoryUk);
        categories.forEach((c) => categorySet.add(c));

        if (categories.length > 0) {
          topCategoryCounts.set(categories[0], (topCategoryCounts.get(categories[0]) ?? 0) + 1);
        }

        const brand = guessBrand(nameUk, categoryUk);
        brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);

        products.push({
          sku: sku || String(csCartId),
          cs_cart_id: csCartId,
          name_ru: "",
          name_uk: nameUk,
          description_ru: "",
          description_uk: sanitizeHTML(cellStr(row, COL.DESCRIPTION)),
          category_path_ru: "",
          category_path_uk: categoryUk,
          categories,
          brand_guess: brand,
          thumbnail_url: cellStr(row, COL.THUMBNAIL),
          image_urls: parseTripleSlash(cellStr(row, COL.IMAGES)),
          image_local_path: "",
          matched_product_id: null,
          matched_product_name: null,
          match_status: "pending",
        });
      }
      i += 1;
    } else {
      i += 1;
    }
  }

  // Sort brands/categories by count desc
  const brands = [...brandCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const top_categories = [...topCategoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    products,
    stats: {
      total_rows: rows.length,
      total_products: products.length,
      with_description_uk: products.filter((p) => p.description_uk.length > 10).length,
      with_description_ru: products.filter((p) => p.description_ru.length > 10).length,
      with_photos: products.filter((p) => p.image_urls.length > 0).length,
      unique_categories: categorySet.size,
      skipped_no_sku: skippedNoSku,
      single_lang_only: singleLangOnly,
      brands,
      top_categories,
    },
    errors,
  };
}
