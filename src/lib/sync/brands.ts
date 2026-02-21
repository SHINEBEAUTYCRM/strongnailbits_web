import { createAdminClient } from "@/lib/supabase/admin";
import { csCart } from "@/lib/cs-cart";
import { slugify } from "@/utils/slugify";
import type { CSCartFeature, CSCartFeatureVariant } from "@/types/cs-cart";
import type { SyncResult } from "@/lib/sync/categories";

/* ------------------------------------------------------------------ */
/*  Константи                                                          */
/* ------------------------------------------------------------------ */

const BRAND_FEATURE_ID = 18; // бренд — синхронізується окремо в brands.ts
const BATCH_SIZE = 100;

/* ------------------------------------------------------------------ */
/*  Маппінг CS-Cart feature_type → наш                                 */
/* ------------------------------------------------------------------ */

function mapFeatureType(csType: string): string {
  const map: Record<string, string> = {
    S: "select",
    M: "multiselect",
    C: "boolean",
    T: "text",
    N: "number",
    E: "brand",
    O: "text",
    D: "text",
  };
  return map[csType] || "text";
}

/* ------------------------------------------------------------------ */
/*  Забезпечити унікальність handle                                    */
/* ------------------------------------------------------------------ */

function deduplicateHandles(
  rows: Array<{ handle: string; cs_cart_id: number }>
): void {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const count = seen.get(row.handle) ?? 0;
    if (count > 0) {
      row.handle = `${row.handle}-${row.cs_cart_id}`;
    }
    seen.set(row.handle, count + 1);
  }
}

/* ================================================================== */
/*  КРОК 1: Sync features (структура характеристик)                    */
/* ================================================================== */

export async function syncFeatures(): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  console.info("[sync:features] Step 1 — Fetching features from CS-Cart...");

  // Fetch all features (paginate)
  const allFeatures: CSCartFeature[] = [];
  let page = 1;
  const perPage = 500;

  while (true) {
    const response = await csCart.getFeatures(page, perPage);
    const features = response.features ?? [];
    allFeatures.push(...features);
    console.info(
      `[sync:features] Page ${page}: got ${features.length} features (total: ${allFeatures.length})`
    );
    if (
      features.length < perPage ||
      allFeatures.length >= (response.params?.total_items ?? allFeatures.length)
    ) {
      break;
    }
    page++;
  }

  console.info(`[sync:features] Total features from CS-Cart: ${allFeatures.length}`);

  // Filter and map
  const rows: Array<{
    cs_cart_id: number;
    name_uk: string;
    name_ru: string | null;
    handle: string;
    feature_type: string;
    filterable: boolean;
    show_on_card: boolean;
    position: number;
    status: string;
  }> = [];

  for (const f of allFeatures) {
    // Skip brand
    if (f.feature_id === BRAND_FEATURE_ID) {
      skipped++;
      continue;
    }
    // Skip disabled
    if (f.status === "D") {
      skipped++;
      continue;
    }
    // Skip empty name
    if (!f.description || !f.description.trim()) {
      skipped++;
      continue;
    }

    const mapped = mapFeatureType(f.feature_type);
    // Skip brand type too
    if (mapped === "brand") {
      skipped++;
      continue;
    }

    rows.push({
      cs_cart_id: f.feature_id,
      name_uk: f.description.trim(),
      name_ru: null, // CS-Cart returns one language per request; we store UK
      handle: slugify(f.description.trim()) || `feature-${f.feature_id}`,
      feature_type: mapped,
      filterable:
        f.purpose === "find_products" ||
        f.purpose === "group_catalog_item" ||
        !!f.filter_style,
      show_on_card: f.status === "A",
      position: f.position ?? 0,
      status: f.status === "A" ? "active" : "disabled",
    });
  }

  // Deduplicate handles
  deduplicateHandles(rows);

  console.info(
    `[sync:features] Prepared ${rows.length} features for upsert (skipped: ${skipped})`
  );

  // Batch upsert
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("features")
      .upsert(batch, { onConflict: "cs_cart_id" });

    if (error) {
      console.error(`[sync:features] Upsert batch error:`, error.message);
      errors.push(error.message);
    } else {
      synced += batch.length;
    }
  }

  console.info(`[sync:features] ✔ Step 1 done: synced=${synced}, skipped=${skipped}`);
  return { synced, skipped, errors };
}

/* ================================================================== */
/*  КРОК 2: Sync feature variants                                      */
/* ================================================================== */

export async function syncFeatureVariants(): Promise<{
  synced: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  let synced = 0;

  console.info("[sync:features] Step 2 — Fetching feature variants...");

  // Get all our features that need variants (select, multiselect, color)
  const { data: features } = await supabase
    .from("features")
    .select("id, cs_cart_id, feature_type")
    .in("feature_type", ["select", "multiselect", "color"])
    .eq("status", "active");

  if (!features || features.length === 0) {
    console.info("[sync:features] No features need variants");
    return { synced: 0, errors: [] };
  }

  console.info(
    `[sync:features] ${features.length} features need variants`
  );

  for (const feature of features) {
    try {
      // Fetch from CS-Cart — try getting feature detail which includes variants
      const detail = await csCart.getFeature(feature.cs_cart_id);
      const rawVariants = detail.variants ?? {};
      const variantList: CSCartFeatureVariant[] = Array.isArray(rawVariants)
        ? rawVariants
        : Object.values(rawVariants);

      if (variantList.length === 0) {
        // Try variants endpoint as fallback
        const varResponse = await csCart.getFeatureVariants(
          feature.cs_cart_id,
          1,
          500
        );
        const fromEndpoint = varResponse.variants ?? [];
        if (fromEndpoint.length > 0) {
          variantList.push(...fromEndpoint);
        }
      }

      if (variantList.length === 0) continue;

      // Map variants
      const rows = variantList.map((v) => ({
        feature_id: feature.id, // UUID з нашої таблиці
        cs_cart_id: v.variant_id,
        value_uk: (v.variant || `Variant ${v.variant_id}`).trim(),
        value_ru: null as string | null,
        position: v.position ?? 0,
        metadata: {
          color: v.color || null,
          image_url: v.image_pair?.detailed?.image_path || null,
        },
      }));

      // Upsert — batch
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from("feature_variants")
          .upsert(batch, { onConflict: "feature_id,value_uk" });

        if (error) {
          console.error(
            `[sync:features] Variants upsert error for feature ${feature.cs_cart_id}:`,
            error.message
          );
          errors.push(`Feature ${feature.cs_cart_id}: ${error.message}`);
        } else {
          synced += batch.length;
        }
      }

      // Small delay to not hammer CS-Cart API
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err);
      console.error(
        `[sync:features] Failed to fetch variants for feature ${feature.cs_cart_id}:`,
        msg
      );
      errors.push(`Feature ${feature.cs_cart_id}: ${msg}`);
    }
  }

  console.info(
    `[sync:features] ✔ Step 2 done: synced=${synced} variants`
  );
  return { synced, errors };
}

/* ================================================================== */
/*  КРОК 3: Sync product feature values (з products.properties JSONB)  */
/* ================================================================== */

export async function syncProductFeatures(): Promise<{
  processed: number;
  created: number;
  errors: number;
}> {
  const supabase = createAdminClient();

  console.info("[sync:features] Step 3 — Mapping product properties to features...");

  // Перевірка: чи є features в базі
  const { count: featCount } = await supabase
    .from("features")
    .select("id", { count: "exact", head: true });

  if (!featCount || featCount === 0) {
    console.error("[sync:features] No features in database! Run syncFeatures() first.");
    return { processed: 0, created: 0, errors: 1 };
  }

  // Завантажити всі features: name_uk → { id, feature_type }
  const { data: allFeatures } = await supabase
    .from("features")
    .select("id, name_uk, feature_type");

  const featureByName = new Map<string, { id: string; feature_type: string }>();
  for (const f of allFeatures ?? []) {
    featureByName.set(f.name_uk.toLowerCase(), {
      id: f.id,
      feature_type: f.feature_type,
    });
  }

  // Завантажити всі feature_variants: feature_id + value_uk → variant UUID
  const { data: allVariants } = await supabase
    .from("feature_variants")
    .select("id, feature_id, value_uk");

  const variantMap = new Map<string, string>();
  for (const v of allVariants ?? []) {
    variantMap.set(`${v.feature_id}::${v.value_uk.toLowerCase()}`, v.id);
  }

  console.info(
    `[sync:features] Loaded ${featureByName.size} features, ${variantMap.size} variants`
  );

  // Fetch products з properties
  const PAGE_SIZE = 1000;
  let offset = 0;
  let processed = 0;
  let created = 0;
  let errorCount = 0;

  while (true) {
    const { data: products } = await supabase
      .from("products")
      .select("id, properties")
      .not("properties", "is", null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (!products || products.length === 0) break;

    const rows: Array<{
      product_id: string;
      feature_id: string;
      variant_id: string | null;
      value_text: string | null;
      value_number: number | null;
      value_boolean: boolean | null;
    }> = [];

    for (const product of products) {
      const props = product.properties as Record<string, string> | null;
      if (!props || typeof props !== "object") continue;

      processed++;

      for (const [key, value] of Object.entries(props)) {
        if (!key || !value) continue;

        const feature = featureByName.get(key.toLowerCase());
        if (!feature) continue; // характеристика не знайдена

        if (
          feature.feature_type === "select" ||
          feature.feature_type === "multiselect" ||
          feature.feature_type === "color"
        ) {
          // Шукаємо variant
          const variantId = variantMap.get(
            `${feature.id}::${value.toLowerCase()}`
          );
          if (variantId) {
            rows.push({
              product_id: product.id,
              feature_id: feature.id,
              variant_id: variantId,
              value_text: null,
              value_number: null,
              value_boolean: null,
            });
          }
        } else if (feature.feature_type === "number") {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            rows.push({
              product_id: product.id,
              feature_id: feature.id,
              variant_id: null,
              value_text: null,
              value_number: num,
              value_boolean: null,
            });
          }
        } else if (feature.feature_type === "boolean") {
          rows.push({
            product_id: product.id,
            feature_id: feature.id,
            variant_id: null,
            value_text: null,
            value_number: null,
            value_boolean:
              value === "Y" || value === "Yes" || value === "1" || value === "true",
          });
        } else {
          // text
          rows.push({
            product_id: product.id,
            feature_id: feature.id,
            variant_id: null,
            value_text: value,
            value_number: null,
            value_boolean: null,
          });
        }
      }
    }

    // Batch insert (не upsert — спочатку чистимо)
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase
          .from("product_feature_values")
          .upsert(batch, {
            onConflict: "product_id,feature_id,variant_id",
            ignoreDuplicates: true,
          });

        if (error) {
          console.error(
            `[sync:features] Product values batch error:`,
            error.message
          );
          errorCount++;
        } else {
          created += batch.length;
        }
      }
    }

    console.info(
      `[sync:features] Processed ${offset + products.length} products, ${created} values so far`
    );

    if (products.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.info(
    `[sync:features] ✔ Step 3 done: processed=${processed}, created=${created}, errors=${errorCount}`
  );
  return { processed, created, errors: errorCount };
}

/* ================================================================== */
/*  Головний pipeline — 3 кроки послідовно                             */
/* ================================================================== */

export async function runFeaturesPipeline(): Promise<SyncResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  // Запис у sync_log
  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ entity: "features", action: "full_sync", status: "started" })
    .select("id")
    .single();

  const logId = logEntry?.id ?? null;

  try {
    // КРОК 1: Features
    const step1 = await syncFeatures();
    console.info("[sync:features] Step 1 result:", step1);

    // КРОК 2: Variants
    const step2 = await syncFeatureVariants();
    console.info("[sync:features] Step 2 result:", step2);

    // КРОК 3: Product values
    const step3 = await syncProductFeatures();
    console.info("[sync:features] Step 3 result:", step3);

    const duration = Date.now() - startTime;

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "completed",
          items_processed: step1.synced + step2.synced + step3.processed,
          items_created: step3.created,
          items_updated: step1.synced,
          items_failed:
            step1.errors.length + step2.errors.length + step3.errors,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return {
      entity: "features",
      status: "completed",
      items_processed: step3.processed,
      items_created: step3.created,
      items_updated: step1.synced,
      items_failed:
        step1.errors.length + step2.errors.length + step3.errors,
      items_disabled: 0,
      duration_ms: duration,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(`[sync:features] ✗ Pipeline failed:`, errorMessage);

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return {
      entity: "features",
      status: "failed",
      items_processed: 0,
      items_created: 0,
      items_updated: 0,
      items_failed: 0,
      items_disabled: 0,
      duration_ms: duration,
      error: errorMessage,
    };
  }
}