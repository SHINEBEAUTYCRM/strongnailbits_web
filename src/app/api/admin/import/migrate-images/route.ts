import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/* ------------------------------------------------------------------ */
/*  In-memory progress state (per-process)                            */
/* ------------------------------------------------------------------ */

interface MigrationProgress {
  status: "idle" | "running" | "paused" | "completed" | "failed";
  total_products: number;
  processed_products: number;
  total_images: number;
  processed_images: number;
  failed_images: number;
  size_bytes: number;
  started_at: string | null;
  last_product_id: string | null;
  errors: Array<{ product_id: string; url: string; error: string }>;
}

let migrationProgress: MigrationProgress = {
  status: "idle",
  total_products: 0,
  processed_products: 0,
  total_images: 0,
  processed_images: 0,
  failed_images: 0,
  size_bytes: 0,
  started_at: null,
  last_product_id: null,
  errors: [],
};

let shouldPause = false;
let shouldStop = false;

/**
 * GET /api/admin/import/migrate-images — get migration status + stats
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  // Count products with external CS-Cart images
  const { count: externalCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .like("main_image_url", "%shine-shop.com.ua%");

  // Count products with Supabase Storage images
  const { count: migratedCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .not("main_image_url", "is", null)
    .not("main_image_url", "like", "%shine-shop.com.ua%");

  // Total products with any image
  const { count: totalWithImages } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .not("main_image_url", "is", null);

  return NextResponse.json({
    progress: migrationProgress,
    stats: {
      external_images: externalCount ?? 0,
      migrated_images: migratedCount ?? 0,
      total_with_images: totalWithImages ?? 0,
    },
  });
}

/**
 * POST /api/admin/import/migrate-images
 * Body: { action: "start" | "pause" | "resume" | "stop", batch_size?: number }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const action = body.action as string;

  if (action === "pause") {
    shouldPause = true;
    return NextResponse.json({ ok: true, message: "Pausing after current batch..." });
  }

  if (action === "stop") {
    shouldStop = true;
    return NextResponse.json({ ok: true, message: "Stopping migration..." });
  }

  if (action === "resume") {
    shouldPause = false;
    shouldStop = false;
    // Continue migration from last_product_id
    runMigration(body.batch_size ?? 10);
    return NextResponse.json({ ok: true, message: "Resuming migration..." });
  }

  if (action === "start") {
    if (migrationProgress.status === "running") {
      return NextResponse.json({ error: "Migration already running" }, { status: 400 });
    }

    shouldPause = false;
    shouldStop = false;

    migrationProgress = {
      status: "running",
      total_products: 0,
      processed_products: 0,
      total_images: 0,
      processed_images: 0,
      failed_images: 0,
      size_bytes: 0,
      started_at: new Date().toISOString(),
      last_product_id: null,
      errors: [],
    };

    runMigration(body.batch_size ?? 10);
    return NextResponse.json({ ok: true, message: "Migration started" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/* ------------------------------------------------------------------ */
/*  Background migration runner                                       */
/* ------------------------------------------------------------------ */

async function runMigration(parallelBatchSize: number) {
  const supabase = createAdminClient();

  try {
    // Count total
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .like("main_image_url", "%shine-shop.com.ua%");

    migrationProgress.total_products = count ?? 0;
    migrationProgress.status = "running";

    let hasMore = true;

    while (hasMore && !shouldStop) {
      if (shouldPause) {
        migrationProgress.status = "paused";
        return;
      }

      // Fetch next batch of products with external images
      let query = supabase
        .from("products")
        .select("id, main_image_url, images")
        .like("main_image_url", "%shine-shop.com.ua%")
        .order("id", { ascending: true })
        .limit(parallelBatchSize);

      if (migrationProgress.last_product_id) {
        query = query.gt("id", migrationProgress.last_product_id);
      }

      const { data: products, error: fetchErr } = await query;

      if (fetchErr || !products || products.length === 0) {
        hasMore = false;
        break;
      }

      // Process batch in parallel
      const promises = products.map((product) => migrateProductImages(supabase, product));
      await Promise.allSettled(promises);

      migrationProgress.last_product_id = products[products.length - 1].id;
      migrationProgress.processed_products += products.length;

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    migrationProgress.status = shouldStop ? "idle" : "completed";
  } catch (err) {
    console.error("[Migrate Images] Error:", err);
    migrationProgress.status = "failed";
  }
}

async function migrateProductImages(
  supabase: ReturnType<typeof createAdminClient>,
  product: { id: string; main_image_url: string | null; images: string[] | null },
) {
  const allUrls: string[] = [];
  if (product.main_image_url) allUrls.push(product.main_image_url);
  if (product.images && Array.isArray(product.images)) {
    allUrls.push(...product.images.filter((u) => u.includes("shine-shop.com.ua")));
  }

  migrationProgress.total_images += allUrls.length;
  const newUrls: string[] = [];

  for (let i = 0; i < allUrls.length; i++) {
    const url = allUrls[i];
    try {
      // Download image
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) throw new Error(`Not an image: ${contentType}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 10 * 1024 * 1024) throw new Error("File too large (>10MB)");

      // Convert to WebP using sharp
      let webpBuffer: Buffer;
      try {
        const sharp = (await import("sharp")).default;
        if (i === 0) {
          // Main image — resize to 1200x1200
          webpBuffer = await sharp(buffer)
            .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        } else {
          // Additional images — resize to 1200x1200
          webpBuffer = await sharp(buffer)
            .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();
        }
      } catch {
        // If sharp fails, upload original
        webpBuffer = buffer;
      }

      // Upload to Supabase Storage
      const fileName = i === 0 ? "main.webp" : `${i + 1}.webp`;
      const storagePath = `products/${product.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(storagePath, webpBuffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadErr) throw new Error(uploadErr.message);

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from("product-images")
        .getPublicUrl(storagePath);

      newUrls.push(publicUrl.publicUrl);
      migrationProgress.processed_images++;
      migrationProgress.size_bytes += webpBuffer.length;
    } catch (err) {
      migrationProgress.failed_images++;
      migrationProgress.errors.push({
        product_id: product.id,
        url,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      // Keep original URL on failure
      newUrls.push(url);
    }
  }

  // Update product with new URLs
  if (newUrls.length > 0) {
    const updateData: Record<string, unknown> = {};
    if (newUrls[0] && !newUrls[0].includes("shine-shop.com.ua")) {
      updateData.main_image_url = newUrls[0];
    }
    if (newUrls.length > 1) {
      const additionalImages = newUrls.slice(1).filter((u) => !u.includes("shine-shop.com.ua"));
      if (additionalImages.length > 0) {
        updateData.images = additionalImages;
      }
    }
    if (Object.keys(updateData).length > 0) {
      await supabase.from("products").update(updateData).eq("id", product.id);
    }
  }
}
