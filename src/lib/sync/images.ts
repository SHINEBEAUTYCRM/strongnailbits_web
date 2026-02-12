import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MigrateOptions {
  offset?: number;
  limit?: number;
}

interface MigrateResult {
  status: "completed" | "partial" | "error";
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  offset: number;
  limit: number;
  duration_ms: number;
  errors: string[];
}

interface ProductRow {
  id: string;
  main_image_url: string | null;
  images: string[] | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BUCKET_NAME = "products";
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const FETCH_TIMEOUT_MS = 30_000;
const BATCH_SIZE = 500;
const LOG_EVERY = 100;

const OLD_HOST = "shine-shop.com.ua";
const SUPABASE_HOST = "supabase.co";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Check if URL points to old CS-Cart server */
function isOldUrl(url: string): boolean {
  return url.includes(OLD_HOST);
}

/** Check if URL is already migrated to Supabase */
function isMigrated(url: string): boolean {
  return url.includes(SUPABASE_HOST);
}

/** Extract file extension from URL */
function getExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(jpe?g|png|webp|gif|avif|svg)$/i);
    return match ? match[0].toLowerCase() : ".jpg";
  } catch {
    return ".jpg";
  }
}

/** Extract a clean filename from URL */
function getFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    // Decode and clean the filename
    const decoded = decodeURIComponent(last).replace(/[^a-zA-Z0-9._-]/g, "_");
    return decoded || `image${getExtension(url)}`;
  } catch {
    return `image.jpg`;
  }
}

/** Determine content type from extension */
function getContentType(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
  };
  return map[ext] || "image/jpeg";
}

/** Sleep helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch with timeout */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ShineShop-B2B-Migrator/1.0",
      },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/** Download image with retries, returns ArrayBuffer or null */
async function downloadWithRetry(
  url: string,
): Promise<ArrayBuffer | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.arrayBuffer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        console.warn(
          `[Images] Download attempt ${attempt}/${MAX_RETRIES} failed for ${url}: ${msg}. Retrying in ${RETRY_DELAY_MS}ms...`,
        );
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error(
          `[Images] All ${MAX_RETRIES} attempts failed for ${url}: ${msg}`,
        );
        return null;
      }
    }
  }
  return null;
}

/** Process chunks with concurrency limit */
async function processInChunks<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  chunkSize: number,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

/* ------------------------------------------------------------------ */
/*  Main migration function                                            */
/* ------------------------------------------------------------------ */

export async function migrateProductImages(
  options: MigrateOptions = {},
): Promise<MigrateResult> {
  const startTime = Date.now();
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 100_000; // default: all

  const supabase = createAdminClient();
  const errors: string[] = [];

  let totalProcessed = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  /* ---- Ensure bucket exists ---- */
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: true,
        fileSizeLimit: 10_485_760, // 10 MB
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/avif",
          "image/svg+xml",
        ],
      },
    );
    if (createError) {
      console.error(`[Images] Failed to create bucket: ${createError.message}`);
      return {
        status: "error",
        total: 0,
        migrated: 0,
        skipped: 0,
        failed: 0,
        offset,
        limit,
        duration_ms: Date.now() - startTime,
        errors: [`Bucket creation failed: ${createError.message}`],
      };
    }
    console.log(`[Images] Created bucket "${BUCKET_NAME}" (public)`);
  }

  /* ---- Fetch products in batches ---- */
  let batchOffset = offset;
  let totalFetched = 0;
  let hasMore = true;

  while (hasMore && totalFetched < limit) {
    const batchLimit = Math.min(BATCH_SIZE, limit - totalFetched);

    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, main_image_url, images")
      .or(
        `main_image_url.ilike.%${OLD_HOST}%,images.cs.{${OLD_HOST}}`,
      )
      .range(batchOffset, batchOffset + batchLimit - 1)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error(`[Images] Fetch error at offset ${batchOffset}: ${fetchError.message}`);
      errors.push(`Fetch error: ${fetchError.message}`);
      break;
    }

    if (!products || products.length === 0) {
      hasMore = false;
      break;
    }

    totalFetched += products.length;
    if (products.length < batchLimit) {
      hasMore = false;
    }

    /* ---- Process products (5 at a time) ---- */
    await processInChunks(
      products as ProductRow[],
      async (product) => {
        try {
          const result = await migrateOneProduct(supabase, product);
          if (result === "migrated") migrated++;
          else if (result === "skipped") skipped++;
          else failed++;
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Product ${product.id}: ${msg}`);
        }

        totalProcessed++;
        if (totalProcessed % LOG_EVERY === 0) {
          console.log(
            `[Images] ${totalProcessed}/${totalFetched}+ migrated: ${migrated}, skipped: ${skipped}, failed: ${failed}`,
          );
        }
      },
      CONCURRENCY,
    );

    batchOffset += products.length;
  }

  const duration = Date.now() - startTime;
  const status = failed > 0 && migrated === 0 ? "error" : totalFetched < limit ? "completed" : "partial";

  console.log(
    `[Images] Done! Total: ${totalProcessed}, Migrated: ${migrated}, Skipped: ${skipped}, Failed: ${failed}. Duration: ${(duration / 1000).toFixed(1)}s`,
  );

  return {
    status,
    total: totalProcessed,
    migrated,
    skipped,
    failed,
    offset,
    limit,
    duration_ms: duration,
    errors: errors.slice(0, 50), // cap error list
  };
}

/* ------------------------------------------------------------------ */
/*  Migrate single product                                             */
/* ------------------------------------------------------------------ */

async function migrateOneProduct(
  supabase: ReturnType<typeof createAdminClient>,
  product: ProductRow,
): Promise<"migrated" | "skipped" | "failed"> {
  const updates: { main_image_url?: string; images?: string[] } = {};
  let didMigrate = false;

  /* ---- Main image ---- */
  if (
    product.main_image_url &&
    isOldUrl(product.main_image_url) &&
    !isMigrated(product.main_image_url)
  ) {
    const newUrl = await uploadImage(
      supabase,
      product.id,
      product.main_image_url,
      "main",
    );
    if (newUrl) {
      updates.main_image_url = newUrl;
      didMigrate = true;
    } else {
      return "failed";
    }
  }

  /* ---- Additional images (JSONB array) ---- */
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const oldImages = product.images.filter(
      (url) => isOldUrl(url) && !isMigrated(url),
    );

    if (oldImages.length > 0) {
      const newImages: string[] = [];
      let allSuccess = true;

      for (const [index, imageUrl] of product.images.entries()) {
        if (isOldUrl(imageUrl) && !isMigrated(imageUrl)) {
          const newUrl = await uploadImage(
            supabase,
            product.id,
            imageUrl,
            `extra_${index}`,
          );
          if (newUrl) {
            newImages.push(newUrl);
            didMigrate = true;
          } else {
            // Keep old URL if upload failed
            newImages.push(imageUrl);
            allSuccess = false;
          }
        } else {
          // Already migrated or different host — keep as is
          newImages.push(imageUrl);
        }
      }

      updates.images = newImages;
      if (!allSuccess && !didMigrate) return "failed";
    }
  }

  if (!didMigrate) return "skipped";

  /* ---- Update product row ---- */
  const { error: updateError } = await supabase
    .from("products")
    .update(updates)
    .eq("id", product.id);

  if (updateError) {
    console.error(
      `[Images] Failed to update product ${product.id}: ${updateError.message}`,
    );
    return "failed";
  }

  return "migrated";
}

/* ------------------------------------------------------------------ */
/*  Upload single image to Storage                                     */
/* ------------------------------------------------------------------ */

async function uploadImage(
  supabase: ReturnType<typeof createAdminClient>,
  productId: string,
  sourceUrl: string,
  prefix: string,
): Promise<string | null> {
  const ext = getExtension(sourceUrl);
  const filename = `${prefix}_${getFilename(sourceUrl)}`;
  const storagePath = `${productId}/${filename}`;

  /* ---- Download ---- */
  const buffer = await downloadWithRetry(sourceUrl);
  if (!buffer) return null;

  /* ---- Upload to Supabase Storage ---- */
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: getContentType(ext),
      cacheControl: "public, max-age=31536000, immutable",
      upsert: true, // overwrite if re-running migration
    });

  if (uploadError) {
    console.error(
      `[Images] Upload failed for ${storagePath}: ${uploadError.message}`,
    );
    return null;
  }

  /* ---- Get public URL ---- */
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  return publicUrl;
}
