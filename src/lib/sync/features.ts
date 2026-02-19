import { createAdminClient } from "@/lib/supabase/admin";
import { csCart } from "@/lib/cs-cart";
import { slugify } from "@/utils/slugify";
import type { CSCartFeature, CSCartFeatureVariant } from "@/types/cs-cart";
import type { SyncResult } from "./categories";

const ITEMS_PER_PAGE = 250;
const BATCH_SIZE = 100;
const BRAND_FEATURE_ID = 18;
const API_DELAY_MS = 50;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function deduplicateSlugs<T extends { slug: string }>(rows: T[]): T[] {
  const count = new Map<string, number>();
  return rows.map((row) => {
    const base = row.slug;
    const n = count.get(base) ?? 0;
    if (n > 0) row.slug = `${base}-${n + 1}`;
    count.set(base, n + 1);
    return row;
  });
}

/* ================================================================== */
/*  syncFeatures                                                       */
/* ================================================================== */

export async function syncFeatures(): Promise<SyncResult> {
  const start = Date.now();
  const supabase = createAdminClient();

  let processed = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;

  try {
    async function fetchAll(langCode: string): Promise<CSCartFeature[]> {
      const all: CSCartFeature[] = [];
      let pg = 1;

      while (true) {
        console.info(`[sync:features] [${langCode.toUpperCase()}] page ${pg}...`);
        const res = await csCart.getFeatures(pg, ITEMS_PER_PAGE, {
          status: "A",
          lang_code: langCode,
        });
        const items = res.features ?? [];
        all.push(...items);

        if (items.length < ITEMS_PER_PAGE) break;
        pg++;
        await delay(API_DELAY_MS);
      }

      return all;
    }

    const [featuresUk, featuresRu] = await Promise.all([
      fetchAll("uk"),
      fetchAll("ru"),
    ]);

    console.info(
      `[sync:features] Fetched UK=${featuresUk.length}, RU=${featuresRu.length}`,
    );

    const ruMap = new Map<number, CSCartFeature>();
    for (const f of featuresRu) ruMap.set(f.feature_id, f);

    const rows = featuresUk
      .filter((f) => f.feature_id !== BRAND_FEATURE_ID)
      .map((f, idx) => ({
        cs_cart_id: f.feature_id,
        name_uk: f.description,
        name_ru: ruMap.get(f.feature_id)?.description || null,
        slug: slugify(f.description) || `feature-${f.feature_id}`,
        feature_type: f.feature_type,
        is_filter: true,
        filter_position: idx,
        status: "active",
      }));

    const dedupedRows = deduplicateSlugs(rows);
    processed = dedupedRows.length;

    for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
      const batch = dedupedRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("features")
        .upsert(batch, { onConflict: "cs_cart_id", ignoreDuplicates: false });

      if (error) {
        console.error(`[sync:features] Batch error:`, error.message);
        failed += batch.length;
      } else {
        updated += batch.length;
      }
    }

    const duration = Date.now() - start;
    console.info(
      `[sync:features] Done in ${duration}ms — processed: ${processed}, updated: ${updated}, failed: ${failed}`,
    );

    return {
      entity: "features",
      status: "completed",
      items_processed: processed,
      items_created: created,
      items_updated: updated,
      items_failed: failed,
      items_disabled: 0,
      duration_ms: duration,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync:features] Failed:`, msg);
    return {
      entity: "features",
      status: "failed",
      items_processed: processed,
      items_created: created,
      items_updated: updated,
      items_failed: failed,
      items_disabled: 0,
      duration_ms: Date.now() - start,
      error: msg,
    };
  }
}

/* ================================================================== */
/*  syncFeatureVariants                                                */
/* ================================================================== */

const VARIANT_FEATURE_TYPES = new Set(["S", "M", "E"]);

export async function syncFeatureVariants(): Promise<SyncResult> {
  const start = Date.now();
  const supabase = createAdminClient();

  let processed = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;

  try {
    const { data: dbFeatures } = await supabase
      .from("features")
      .select("id, cs_cart_id, feature_type")
      .eq("status", "active");

    const featuresToSync = (dbFeatures || []).filter((f) =>
      VARIANT_FEATURE_TYPES.has(f.feature_type),
    );

    console.info(
      `[sync:variants] Features with variants: ${featuresToSync.length}`,
    );

    const allRows: Array<Record<string, unknown>> = [];

    for (const feature of featuresToSync) {
      const fullFeature = await csCart.getFeature(feature.cs_cart_id);
      await delay(API_DELAY_MS);

      if (!fullFeature.variants) continue;

      const variantsList: CSCartFeatureVariant[] = Array.isArray(fullFeature.variants)
        ? fullFeature.variants
        : Object.values(fullFeature.variants);

      for (const v of variantsList) {
        allRows.push({
          feature_id: feature.id,
          cs_cart_id: v.variant_id,
          name_uk: v.variant,
          name_ru: null,
          slug: slugify(v.variant) || `variant-${v.variant_id}`,
          position: v.position ?? 0,
          color_code: v.color || null,
          image_url: v.image_pair?.detailed?.image_path || null,
        });
      }
    }

    const dedupedRows = deduplicateSlugs(allRows as Array<Record<string, unknown> & { slug: string }>);
    processed = dedupedRows.length;

    console.info(`[sync:variants] Total variants to upsert: ${processed}`);

    for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
      const batch = dedupedRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("feature_variants")
        .upsert(batch, { onConflict: "cs_cart_id", ignoreDuplicates: false });

      if (error) {
        console.error(`[sync:variants] Batch error:`, error.message);
        failed += batch.length;
      } else {
        updated += batch.length;
      }
    }

    const duration = Date.now() - start;
    console.info(
      `[sync:variants] Done in ${duration}ms — processed: ${processed}, updated: ${updated}, failed: ${failed}`,
    );

    return {
      entity: "feature_variants",
      status: "completed",
      items_processed: processed,
      items_created: created,
      items_updated: updated,
      items_failed: failed,
      items_disabled: 0,
      duration_ms: duration,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync:variants] Failed:`, msg);
    return {
      entity: "feature_variants",
      status: "failed",
      items_processed: processed,
      items_created: created,
      items_updated: updated,
      items_failed: failed,
      items_disabled: 0,
      duration_ms: Date.now() - start,
      error: msg,
    };
  }
}

/* ================================================================== */
/*  syncProductFeatures                                                */
/* ================================================================== */

const PRODUCTS_PAGE_SIZE = 1000;
const TEXT_FEATURE_TYPES = new Set(["T", "N", "C"]);

const IGNORED_FEATURE_NAMES = [
  "артикулксрм",
  "!скидочный",
  "бренд",
  "популярные запросы",
];

function isIgnoredFeature(nameUk: string | null, nameRu: string | null): boolean {
  const lower = [nameUk, nameRu]
    .filter(Boolean)
    .map((n) => n!.toLowerCase());
  return lower.some((n) => IGNORED_FEATURE_NAMES.some((ig) => n.includes(ig)));
}

export async function syncProductFeatures(): Promise<SyncResult> {
  const start = Date.now();
  const supabase = createAdminClient();

  let processed = 0;
  let created = 0;
  let failed = 0;

  try {
    /* Build feature lookups (UK + RU) */
    const { data: allFeatures } = await supabase
      .from("features")
      .select("id, cs_cart_id, name_uk, name_ru, feature_type");

    type FeatureEntry = { id: string; feature_type: string };
    const featureByNameUk = new Map<string, FeatureEntry>();
    const featureByNameRu = new Map<string, FeatureEntry>();

    for (const f of allFeatures || []) {
      if (isIgnoredFeature(f.name_uk, f.name_ru)) continue;

      const entry: FeatureEntry = { id: f.id, feature_type: f.feature_type };
      if (f.name_uk) featureByNameUk.set(f.name_uk.toLowerCase(), entry);
      if (f.name_ru) featureByNameRu.set(f.name_ru.toLowerCase(), entry);
    }

    /* Build variant lookups (UK + RU) */
    const { data: allVariants } = await supabase
      .from("feature_variants")
      .select("id, feature_id, name_uk, name_ru");

    const variantByNameUk = new Map<string, string>();
    const variantByNameRu = new Map<string, string>();

    for (const v of allVariants || []) {
      if (v.name_uk) variantByNameUk.set(`${v.feature_id}:${v.name_uk.toLowerCase()}`, v.id);
      if (v.name_ru) variantByNameRu.set(`${v.feature_id}:${v.name_ru.toLowerCase()}`, v.id);
    }

    console.info(
      `[sync:product-features] Lookups: ${featureByNameUk.size} uk + ${featureByNameRu.size} ru features, ${variantByNameUk.size} uk + ${variantByNameRu.size} ru variants`,
    );

    /* Clear existing product_features */
    const { error: clearErr } = await supabase
      .from("product_features")
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000");

    if (clearErr) {
      console.error("[sync:product-features] Failed to clear table:", clearErr.message);
    }

    /* Process products in pages */
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: products } = await supabase
        .from("products")
        .select("id, properties")
        .not("properties", "is", null)
        .range(offset, offset + PRODUCTS_PAGE_SIZE - 1);

      if (!products || products.length === 0) {
        hasMore = false;
        break;
      }

      const rows: Array<Record<string, unknown>> = [];

      for (const product of products) {
        const props = product.properties as Record<string, string> | null;
        if (!props || typeof props !== "object") continue;

        for (const [name, value] of Object.entries(props)) {
          const key = name.toLowerCase();
          const feature =
            featureByNameUk.get(key) || featureByNameRu.get(key);
          if (!feature) continue;

          const isTextType = TEXT_FEATURE_TYPES.has(feature.feature_type);
          const valLower = String(value).toLowerCase();
          const variantId = isTextType
            ? null
            : variantByNameUk.get(`${feature.id}:${valLower}`) ||
              variantByNameRu.get(`${feature.id}:${valLower}`) ||
              null;

          rows.push({
            product_id: product.id,
            feature_id: feature.id,
            variant_id: variantId,
            value_text: isTextType ? String(value) : null,
          });
        }
      }

      /* Deduplicate by product_id:feature_id (properties may have both UK and RU keys) */
      const seen = new Set<string>();
      const dedupedRows = rows.filter((r) => {
        const k = `${r.product_id}:${r.feature_id}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      if (dedupedRows.length < rows.length) {
        console.info(
          `[sync:product-features] Deduped: ${rows.length} → ${dedupedRows.length}`,
        );
      }

      /* Batch insert */
      for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
        const batch = dedupedRows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("product_features").insert(batch);

        if (error) {
          console.error("[sync:product-features] Batch error:", error.message);
          failed += batch.length;
        } else {
          created += batch.length;
        }
      }

      processed += products.length;
      offset += PRODUCTS_PAGE_SIZE;

      if (products.length < PRODUCTS_PAGE_SIZE) hasMore = false;
    }

    const duration = Date.now() - start;
    console.info(
      `[sync:product-features] Done in ${duration}ms — products: ${processed}, links: ${created}, failed: ${failed}`,
    );

    return {
      entity: "product_features",
      status: "completed",
      items_processed: processed,
      items_created: created,
      items_updated: 0,
      items_failed: failed,
      items_disabled: 0,
      duration_ms: duration,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sync:product-features] Failed:", msg);
    return {
      entity: "product_features",
      status: "failed",
      items_processed: processed,
      items_created: created,
      items_updated: 0,
      items_failed: failed,
      items_disabled: 0,
      duration_ms: Date.now() - start,
      error: msg,
    };
  }
}
