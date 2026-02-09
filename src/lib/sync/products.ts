import { createAdminClient } from "@/lib/supabase/admin";
import { csCart } from "@/lib/cs-cart";
import { slugify } from "@/utils/slugify";
import type { CSCartProduct } from "@/types/cs-cart";
import type { SyncResult } from "@/lib/sync/categories";

/* ------------------------------------------------------------------ */
/*  Типи                                                               */
/* ------------------------------------------------------------------ */

interface ProductRow {
  cs_cart_id: number;
  category_id: string | null;
  name_uk: string;
  name_ru: string | null;
  slug: string;
  sku: string | null;
  description_uk: string | null;
  description_ru: string | null;
  price: number;
  old_price: number | null;
  quantity: number;
  status: string;
  main_image_url: string | null;
  images: string[];
  weight: number | null;
  meta_title: string;
  meta_description: string;
  cs_cart_updated_at: string | null;
  cs_cart_url: string | null;
  properties: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Константи                                                          */
/* ------------------------------------------------------------------ */

const ITEMS_PER_PAGE = 250;
const BATCH_SIZE = 100;
const CS_CART_BASE_URL = "https://shine-shop.com.ua";

/* ------------------------------------------------------------------ */
/*  Хелпери                                                            */
/* ------------------------------------------------------------------ */

/** Нормалізація URL фото: якщо відносний — додати базовий домен */
function normalizeImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${CS_CART_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

/** Конвертувати CS-Cart ціну (string | number) → number */
function parsePrice(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

/** Конвертувати Unix timestamp → ISO string */
function unixToIso(ts: number | undefined | null): string | null {
  if (!ts || ts <= 0) return null;
  return new Date(ts * 1000).toISOString();
}

/** Зібрати масив URL фото з image_pairs */
function extractImages(product: CSCartProduct): string[] {
  const urls: string[] = [];

  // main_pair
  const mainUrl = normalizeImageUrl(product.main_pair?.detailed?.image_path);
  if (mainUrl) urls.push(mainUrl);

  // image_pairs
  if (product.image_pairs) {
    for (const pair of Object.values(product.image_pairs)) {
      const url = normalizeImageUrl(pair?.detailed?.image_path);
      if (url && !urls.includes(url)) urls.push(url);
    }
  }

  return urls;
}

/* ------------------------------------------------------------------ */
/*  Маппінг CS-Cart → Supabase                                        */
/* ------------------------------------------------------------------ */

function mapProduct(
  product: CSCartProduct,
  categoryMap: Map<number, string>,
  ruProduct?: CSCartProduct | null,
): ProductRow {
  const price = parsePrice(product.price);
  // CS-Cart uses base_price for original price before discount (list_price is usually 0)
  const basePrice = parsePrice(product.base_price);
  const listPrice = parsePrice(product.list_price);
  // Pick the higher of base_price and list_price as the "old" price
  const oldPriceCandidate = Math.max(basePrice, listPrice);
  const name = product.product || `Product ${product.product_id}`;

  // Russian name / description from RU fetch
  const nameRu = ruProduct?.product || null;
  const descriptionRu = ruProduct?.full_description || null;

  // Slug: seo_name з CS-Cart або генеруємо з назви
  const rawSlug = product.seo_name
    ? product.seo_name.replace(/\.html?$/i, "").replace(/\//g, "-")
    : slugify(name);
  const slug = rawSlug || `product-${product.product_id}`;

  // Category UUID через Map
  const categoryId = categoryMap.get(product.main_category) ?? null;

  // SEO
  const metaTitle = product.page_title?.trim()
    || `${name} | Купити в Shine Shop`;
  const metaDescription = product.short_description?.trim()
    || product.meta_description?.trim()
    || `✅ ${name} ціна від ${price} ₴. Доставка по Україні. Замовити в Shine Shop`;

  // cs_cart_url для 301 редиректів
  const csCartUrl = product.seo_name
    ? `${CS_CART_BASE_URL}/${product.seo_name}`
    : null;

  // Extract product features/properties (skip brand feature_id=18)
  const properties: Record<string, string> = {};
  if (product.product_features) {
    for (const [, feature] of Object.entries(product.product_features)) {
      if (feature.feature_id === "18") continue; // brand is stored separately
      const fname = feature.description;
      const fvalue = feature.variant || feature.value;
      if (fname && fvalue) {
        properties[fname] = fvalue;
      }
    }
  }

  return {
    cs_cart_id: product.product_id,
    category_id: categoryId,
    name_uk: name,
    name_ru: nameRu,
    slug,
    sku: product.product_code || null,
    description_uk: product.full_description || null,
    description_ru: descriptionRu,
    price,
    old_price: oldPriceCandidate > 0 && oldPriceCandidate > price ? oldPriceCandidate : null,
    quantity: product.amount ?? 0,
    status: product.status === "A" ? "active" : "disabled",
    main_image_url: normalizeImageUrl(product.main_pair?.detailed?.image_path),
    images: extractImages(product),
    weight: parsePrice(product.weight) || null,
    meta_title: metaTitle,
    meta_description: metaDescription,
    cs_cart_updated_at: unixToIso(product.updated_timestamp),
    cs_cart_url: csCartUrl,
    properties,
  };
}

/* ------------------------------------------------------------------ */
/*  Забезпечити унікальність slug'ів                                   */
/* ------------------------------------------------------------------ */

function deduplicateSlugs(rows: ProductRow[]): ProductRow[] {
  const slugCount = new Map<string, number>();

  return rows.map((row) => {
    const base = row.slug;
    const count = slugCount.get(base) ?? 0;

    if (count > 0) {
      row.slug = `${base}-${row.cs_cart_id}`;
    }

    slugCount.set(base, count + 1);
    return row;
  });
}

/* ------------------------------------------------------------------ */
/*  Головна функція синхронізації                                      */
/* ------------------------------------------------------------------ */

export async function syncProducts(): Promise<SyncResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  let logId: string | null = null;
  let itemsProcessed = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsFailed = 0;
  let itemsDisabled = 0;

  try {
    /* ---- 1. Створити запис в sync_log ---- */

    const { data: logEntry, error: logError } = await supabase
      .from("sync_log")
      .insert({
        entity: "products",
        action: "full_sync",
        status: "started",
      })
      .select("id")
      .single();

    if (logError) {
      console.error("[sync:products] Failed to create sync_log:", logError.message);
    } else {
      logId = logEntry.id;
    }

    console.log("[sync:products] Starting full sync...");

    /* ---- 2. Завантажити категорії → Map<cs_cart_id, uuid> ---- */

    console.log("[sync:products] Loading category map...");

    const categoryMap = new Map<number, string>();
    let catOffset = 0;
    const catPageSize = 1000;
    let catHasMore = true;

    while (catHasMore) {
      const { data: cats, error: catError } = await supabase
        .from("categories")
        .select("id, cs_cart_id")
        .range(catOffset, catOffset + catPageSize - 1);

      if (catError) {
        console.error("[sync:products] Failed to load categories:", catError.message);
        break;
      }

      if (!cats || cats.length === 0) {
        catHasMore = false;
      } else {
        cats.forEach((c) => categoryMap.set(c.cs_cart_id, c.id));
        catOffset += catPageSize;
        catHasMore = cats.length === catPageSize;
      }
    }

    console.log(`[sync:products] Category map loaded: ${categoryMap.size} entries`);

    /* ---- 3. Завантажити ВСІ активні товари з CS-Cart (UK + RU) ---- */

    async function fetchAllProducts(langCode: string): Promise<CSCartProduct[]> {
      const all: CSCartProduct[] = [];
      let pg = 1;
      let more = true;
      let tp = "?";

      while (more) {
        const response = await csCart.getProducts(pg, ITEMS_PER_PAGE, {
          status: "A",
          lang_code: langCode,
        });
        const products = response.products ?? [];
        all.push(...products);

        const totalItems = Number(response.params?.total_items ?? 0);
        const fetched = pg * ITEMS_PER_PAGE;

        if (tp === "?") {
          tp = String(Math.ceil(totalItems / ITEMS_PER_PAGE));
        }

        console.log(
          `[sync:products] [${langCode.toUpperCase()}] Page ${pg}/${tp}: got ${products.length} items (${Math.min(fetched, totalItems)}/${totalItems})`,
        );

        more = products.length === ITEMS_PER_PAGE && fetched < totalItems;
        pg++;
      }

      return all;
    }

    console.log("[sync:products] Fetching UK and RU products in parallel...");

    const [allProducts, allProductsRu] = await Promise.all([
      fetchAllProducts("uk"),
      fetchAllProducts("ru"),
    ]);

    console.log(
      `[sync:products] Total fetched: UK=${allProducts.length}, RU=${allProductsRu.length}`,
    );

    // Build RU lookup map by product_id
    const ruMap = new Map<number, CSCartProduct>();
    for (const p of allProductsRu) {
      ruMap.set(p.product_id, p);
    }

    /* ---- 4. Маппінг та підготовка рядків ---- */

    const rows = deduplicateSlugs(
      allProducts.map((p) => mapProduct(p, categoryMap, ruMap.get(p.product_id))),
    );
    const activeCsCartIds = rows.map((r) => r.cs_cart_id);
    itemsProcessed = rows.length;

    /* ---- 5. Batch upsert у Supabase ---- */

    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.log(
        `[sync:products] Upserting batch ${batchNum}/${totalBatches} (${batch.length} items)...`,
      );

      const { data, error } = await supabase
        .from("products")
        .upsert(batch, {
          onConflict: "cs_cart_id",
          ignoreDuplicates: false,
        })
        .select("id");

      if (error) {
        console.error(
          `[sync:products] Batch ${batchNum} error: ${error.message}`,
        );
        itemsFailed += batch.length;
      } else {
        const count = data?.length ?? batch.length;
        itemsUpdated += count;
      }
    }

    itemsCreated = 0; // Supabase upsert не розрізняє insert/update

    /* ---- 6. Позначити відсутні товари як disabled ---- */

    console.log("[sync:products] Hard-deleting removed/inactive products...");

    const { data: deletedRows, error: deleteError } = await supabase
      .from("products")
      .delete()
      .not("cs_cart_id", "in", `(${activeCsCartIds.join(",")})`)
      .select("id");

    if (deleteError) {
      console.error(
        "[sync:products] Failed to delete products:",
        deleteError.message,
      );
    } else {
      itemsDisabled = deletedRows?.length ?? 0;
      if (itemsDisabled > 0) {
        console.log(`[sync:products] Deleted ${itemsDisabled} products`);
      } else {
        console.log("[sync:products] No products to delete");
      }
    }

    /* ---- 7. Оновити sync_log ---- */

    const duration = Date.now() - startTime;

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "completed",
          items_processed: itemsProcessed,
          items_created: itemsCreated,
          items_updated: itemsUpdated,
          items_failed: itemsFailed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    console.log(
      `[sync:products] ✓ Completed in ${duration}ms — ` +
        `processed: ${itemsProcessed}, updated: ${itemsUpdated}, ` +
        `failed: ${itemsFailed}, disabled: ${itemsDisabled}`,
    );

    return {
      entity: "products",
      status: "completed",
      items_processed: itemsProcessed,
      items_created: itemsCreated,
      items_updated: itemsUpdated,
      items_failed: itemsFailed,
      items_disabled: itemsDisabled,
      duration_ms: duration,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(`[sync:products] ✗ Failed after ${duration}ms:`, errorMessage);

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "failed",
          items_processed: itemsProcessed,
          items_created: itemsCreated,
          items_updated: itemsUpdated,
          items_failed: itemsFailed,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return {
      entity: "products",
      status: "failed",
      items_processed: itemsProcessed,
      items_created: itemsCreated,
      items_updated: itemsUpdated,
      items_failed: itemsFailed,
      items_disabled: itemsDisabled,
      duration_ms: duration,
      error: errorMessage,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Зв'язування товарів з брендами                                     */
/* ------------------------------------------------------------------ */

const BRAND_FEATURE_ID = "18";

export interface LinkBrandsResult {
  status: "completed" | "failed";
  products_scanned: number;
  products_linked: number;
  products_no_brand: number;
  brands_not_found: number;
  batches_failed: number;
  duration_ms: number;
  error?: string;
}

export async function linkProductsBrands(): Promise<LinkBrandsResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  let productsScanned = 0;
  let productsLinked = 0;
  let productsNoBrand = 0;
  let brandsNotFound = 0;
  let batchesFailed = 0;

  try {
    /* ---- 1. Завантажити бренди з Supabase → Map<cs_cart_id, uuid> ---- */

    console.log("[link-brands] Loading brands map from Supabase...");

    const brandMap = new Map<number, string>();
    let brandOffset = 0;
    const brandPageSize = 500;
    let brandHasMore = true;

    while (brandHasMore) {
      const { data: brands, error: brandError } = await supabase
        .from("brands")
        .select("id, cs_cart_id")
        .range(brandOffset, brandOffset + brandPageSize - 1);

      if (brandError) {
        console.error("[link-brands] Failed to load brands:", brandError.message);
        break;
      }

      if (!brands || brands.length === 0) {
        brandHasMore = false;
      } else {
        brands.forEach((b) => {
          if (b.cs_cart_id != null) brandMap.set(b.cs_cart_id, b.id);
        });
        brandOffset += brandPageSize;
        brandHasMore = brands.length === brandPageSize;
      }
    }

    console.log(`[link-brands] Brand map loaded: ${brandMap.size} entries`);

    /* ---- 2. Завантажити товари з CS-Cart посторінково ---- */

    console.log("[link-brands] Fetching products from CS-Cart...");

    // Збираємо пари { product_cs_cart_id, brand_uuid }
    const updates: { cs_cart_id: number; brand_id: string }[] = [];

    let page = 1;
    let hasMore = true;
    let totalPages = "?";

    while (hasMore) {
      const response = await csCart.getProducts(page, ITEMS_PER_PAGE, { status: "A" });
      const products = response.products ?? [];

      const totalItems = Number(response.params?.total_items ?? 0);
      const fetched = page * ITEMS_PER_PAGE;

      if (totalPages === "?") {
        totalPages = String(Math.ceil(totalItems / ITEMS_PER_PAGE));
      }

      for (const product of products) {
        productsScanned++;
        const brandFeature = product.product_features?.[BRAND_FEATURE_ID];

        if (!brandFeature || !brandFeature.variant_id || brandFeature.variant_id === "0") {
          productsNoBrand++;
          continue;
        }

        const variantId = Number(brandFeature.variant_id);
        const brandUuid = brandMap.get(variantId);

        if (!brandUuid) {
          brandsNotFound++;
          continue;
        }

        updates.push({
          cs_cart_id: product.product_id,
          brand_id: brandUuid,
        });
      }

      console.log(
        `[link-brands] Page ${page}/${totalPages}: scanned ${products.length}, ` +
          `found brands for ${updates.length} products so far`,
      );

      hasMore = products.length === ITEMS_PER_PAGE && fetched < totalItems;
      page++;
    }

    console.log(
      `[link-brands] Total: ${productsScanned} scanned, ${updates.length} to link, ` +
        `${productsNoBrand} no brand, ${brandsNotFound} brand not in map`,
    );

    /* ---- 3. Batch UPDATE в Supabase ---- */

    const totalBatches = Math.ceil(updates.length / BATCH_SIZE);

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.log(
        `[link-brands] Updating batch ${batchNum}/${totalBatches} (${batch.length} items)...`,
      );

      // Supabase не підтримує batch update з різними значеннями brand_id,
      // тому групуємо по brand_id і робимо один update на кожну групу.
      const byBrand = new Map<string, number[]>();
      for (const upd of batch) {
        const arr = byBrand.get(upd.brand_id) ?? [];
        arr.push(upd.cs_cart_id);
        byBrand.set(upd.brand_id, arr);
      }

      let batchLinked = 0;
      let batchFailed = false;

      for (const [brandId, csCartIds] of byBrand) {
        const { data, error } = await supabase
          .from("products")
          .update({ brand_id: brandId })
          .in("cs_cart_id", csCartIds)
          .select("id");

        if (error) {
          console.error(
            `[link-brands] Update error for brand ${brandId}: ${error.message}`,
          );
          batchFailed = true;
        } else {
          batchLinked += data?.length ?? 0;
        }
      }

      productsLinked += batchLinked;
      if (batchFailed) batchesFailed++;
    }

    const duration = Date.now() - startTime;

    console.log(
      `[link-brands] ✓ Completed in ${duration}ms — ` +
        `linked: ${productsLinked}, no brand: ${productsNoBrand}, ` +
        `brand not found: ${brandsNotFound}, batches failed: ${batchesFailed}`,
    );

    return {
      status: "completed",
      products_scanned: productsScanned,
      products_linked: productsLinked,
      products_no_brand: productsNoBrand,
      brands_not_found: brandsNotFound,
      batches_failed: batchesFailed,
      duration_ms: duration,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(`[link-brands] ✗ Failed after ${duration}ms:`, errorMessage);

    return {
      status: "failed",
      products_scanned: productsScanned,
      products_linked: productsLinked,
      products_no_brand: productsNoBrand,
      brands_not_found: brandsNotFound,
      batches_failed: batchesFailed,
      duration_ms: duration,
      error: errorMessage,
    };
  }
}
