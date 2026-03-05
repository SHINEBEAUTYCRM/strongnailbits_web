import { createAdminClient } from "@/lib/supabase/admin";
import { csCart } from "@/lib/cs-cart";
import { slugify } from "@/utils/slugify";
import type { CSCartFeatureVariant } from "@/types/cs-cart";
import type { SyncResult } from "@/lib/sync/categories";

/* ------------------------------------------------------------------ */
/*  Типи                                                               */
/* ------------------------------------------------------------------ */

interface BrandRow {
  cs_cart_id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  position: number;
}

/* ------------------------------------------------------------------ */
/*  Константи                                                          */
/* ------------------------------------------------------------------ */

const BRAND_FEATURE_ID = 18;
const BATCH_SIZE = 50;
const CS_CART_BASE_URL = "https://strongnailbits.com.ua";

/* ------------------------------------------------------------------ */
/*  Хелпери                                                            */
/* ------------------------------------------------------------------ */

function normalizeImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${CS_CART_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

/* ------------------------------------------------------------------ */
/*  Маппінг CS-Cart variant → Supabase brand row                      */
/* ------------------------------------------------------------------ */

function mapBrand(variant: CSCartFeatureVariant): BrandRow {
  const name = variant.variant || `Brand ${variant.variant_id}`;
  return {
    cs_cart_id: variant.variant_id,
    name,
    slug: slugify(name) || `brand-${variant.variant_id}`,
    logo_url: normalizeImageUrl(variant.image_pair?.detailed?.image_path),
    position: variant.position ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Забезпечити унікальність slug'ів                                   */
/* ------------------------------------------------------------------ */

function deduplicateSlugs(rows: BrandRow[]): BrandRow[] {
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

export async function syncBrands(): Promise<SyncResult> {
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
        entity: "brands",
        action: "full_sync",
        status: "started",
      })
      .select("id")
      .single();

    if (logError) {
      console.error("[sync:brands] Failed to create sync_log:", logError.message);
    } else {
      logId = logEntry.id;
    }

    console.info("[sync:brands] Starting full sync...");

    /* ---- 2. Завантажити feature "Бренд" (id=18) з варіантами ---- */

    console.info(`[sync:brands] Fetching feature ${BRAND_FEATURE_ID}...`);
    const feature = await csCart.getFeature(BRAND_FEATURE_ID);

    const rawVariants = feature.variants ?? {};
    const allVariants: CSCartFeatureVariant[] = Array.isArray(rawVariants)
      ? rawVariants
      : Object.values(rawVariants);

    console.info(`[sync:brands] Got ${allVariants.length} brand variants`);

    /* ---- 3. Маппінг та підготовка рядків ---- */

    const rows = deduplicateSlugs(allVariants.map(mapBrand));
    const activeCsCartIds = rows.map((r) => r.cs_cart_id);
    itemsProcessed = rows.length;

    /* ---- 4. Batch upsert у Supabase ---- */

    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.info(
        `[sync:brands] Upserting batch ${batchNum}/${totalBatches} (${batch.length} items)...`,
      );

      const { data, error } = await supabase
        .from("brands")
        .upsert(batch, {
          onConflict: "cs_cart_id",
          ignoreDuplicates: false,
        })
        .select("id");

      if (error) {
        console.error(
          `[sync:brands] Batch ${batchNum} error: ${error.message}`,
        );
        itemsFailed += batch.length;
      } else {
        const count = data?.length ?? batch.length;
        itemsUpdated += count;
      }
    }

    itemsCreated = 0;

    /* ---- 5. Позначити відсутні бренди (видалити зі списку активних) ---- */

    if (activeCsCartIds.length > 0) {
      console.info("[sync:brands] Removing unlisted brands...");

      const { data: deletedRows, error: deleteError } = await supabase
        .from("brands")
        .delete()
        .not("cs_cart_id", "in", `(${activeCsCartIds.join(",")})`)
        .select("id");

      if (deleteError) {
        console.error(
          "[sync:brands] Failed to remove brands:",
          deleteError.message,
        );
      } else {
        itemsDisabled = deletedRows?.length ?? 0;
        if (itemsDisabled > 0) {
          console.info(`[sync:brands] Removed ${itemsDisabled} brands`);
        } else {
          console.info("[sync:brands] No brands to remove");
        }
      }
    }

    /* ---- 6. Оновити sync_log ---- */

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

    console.info(
      `[sync:brands] ✓ Completed in ${duration}ms — ` +
        `processed: ${itemsProcessed}, updated: ${itemsUpdated}, ` +
        `failed: ${itemsFailed}, removed: ${itemsDisabled}`,
    );

    return {
      entity: "brands",
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

    console.error(`[sync:brands] ✗ Failed after ${duration}ms:`, errorMessage);

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
      entity: "brands",
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