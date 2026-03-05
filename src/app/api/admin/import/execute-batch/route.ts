import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface CSCartItem {
  sku: string;
  cs_cart_id: number | null;
  name_ru: string;
  name_uk: string;
  description_ru: string;
  description_uk: string;
  categories: string[];
  category_path_ru: string;
  category_path_uk: string;
  thumbnail_url: string;
  image_urls: string[];
  matched_product_id: string | null;
}

interface ImportOptions {
  importDescriptionUk: boolean;
  importDescriptionRu: boolean;
  importNames: boolean;
  importCategories: boolean;
  importImages: boolean;
  onlyFillEmpty: boolean;
  onlyUpdate: boolean;
  skipMismatchedDescriptions: boolean;
  saveSnapshot: boolean;
}

interface SnapshotItem {
  id: string;
  action: "updated";
  previous_data: Record<string, unknown>;
}

/**
 * POST /api/admin/import/execute-batch
 * Process a chunk of pre-matched products.
 * Items MUST have matched_product_id set (from match-products step).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { batchId, items, isLast, options } = body as {
      batchId: string;
      items: CSCartItem[];
      isLast: boolean;
      options: ImportOptions;
    };

    const supabase = createAdminClient();

    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];
    const snapshotItems: SnapshotItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Only update matched products
        if (!item.matched_product_id) {
          skipped++;
          continue;
        }

        // Fetch current product data (for comparison and snapshot)
        const { data: existing } = await supabase
          .from("products")
          .select("id, name_uk, name_ru, description_uk, description_ru, main_image_url, images, category_id, cs_cart_id")
          .eq("id", item.matched_product_id)
          .single();

        if (!existing) {
          skipped++;
          errors.push({ row: i, error: `Product ${item.matched_product_id} not found` });
          continue;
        }

        // Build update payload based on options
        const updateData: Record<string, unknown> = {};
        const previousData: Record<string, unknown> = {};

        if (options.importDescriptionUk && item.description_uk) {
          if (!options.onlyFillEmpty || !existing.description_uk) {
            previousData.description_uk = existing.description_uk ?? null;
            updateData.description_uk = item.description_uk;
          }
        }

        if (options.importDescriptionRu && item.description_ru) {
          if (!options.onlyFillEmpty || !existing.description_ru) {
            previousData.description_ru = existing.description_ru ?? null;
            updateData.description_ru = item.description_ru;
          }
        }

        if (options.importNames) {
          if (item.name_uk && (!options.onlyFillEmpty || !existing.name_uk)) {
            previousData.name_uk = existing.name_uk ?? null;
            updateData.name_uk = item.name_uk;
          }
          if (item.name_ru && (!options.onlyFillEmpty || !existing.name_ru)) {
            previousData.name_ru = existing.name_ru ?? null;
            updateData.name_ru = item.name_ru;
          }
        }

        if (options.importImages && item.image_urls.length > 0) {
          if (!options.onlyFillEmpty || !existing.main_image_url) {
            previousData.main_image_url = existing.main_image_url ?? null;
            updateData.main_image_url = item.image_urls[0];
          }
          if (item.image_urls.length > 1) {
            const existingImages = existing.images as string[] | null;
            if (!options.onlyFillEmpty || !existingImages || existingImages.length === 0) {
              previousData.images = existingImages ?? null;
              updateData.images = item.image_urls.slice(1);
            }
          }
        }

        // Set cs_cart_id if not present
        if (item.cs_cart_id && !existing.cs_cart_id) {
          previousData.cs_cart_id = existing.cs_cart_id ?? null;
          updateData.cs_cart_id = item.cs_cart_id;
        }

        if (Object.keys(updateData).length === 0) {
          skipped++;
          continue;
        }

        // Save snapshot for rollback
        if (options.saveSnapshot) {
          snapshotItems.push({
            id: String(existing.id),
            action: "updated",
            previous_data: previousData,
          });
        }

        const { error: updateErr } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", item.matched_product_id);

        if (updateErr) {
          errors.push({ row: i, error: updateErr.message });
          skipped++;
        } else {
          updated++;
        }
      } catch (err) {
        errors.push({ row: i, error: err instanceof Error ? err.message : "Unknown error" });
        skipped++;
      }
    }

    // Update batch with running totals
    const { data: currentBatch } = await supabase
      .from("import_batches")
      .select("created_count, updated_count, skipped_count, error_count, snapshot, errors")
      .eq("id", batchId)
      .single();

    const prevSnapshot = (currentBatch?.snapshot as { items: SnapshotItem[] } | null)?.items ?? [];
    const prevErrors = (currentBatch?.errors as Array<{ row: number; error: string }> | null) ?? [];

    const updatePayload: Record<string, unknown> = {
      updated_count: (currentBatch?.updated_count ?? 0) + updated,
      skipped_count: (currentBatch?.skipped_count ?? 0) + skipped,
      error_count: (currentBatch?.error_count ?? 0) + errors.length,
    };

    if (options.saveSnapshot) {
      updatePayload.snapshot = { items: [...prevSnapshot, ...snapshotItems] };
    }
    if ([...prevErrors, ...errors].length > 0) {
      updatePayload.errors = [...prevErrors, ...errors];
    }

    if (isLast) {
      updatePayload.status = "completed";
      updatePayload.completed_at = new Date().toISOString();
    }

    await supabase.from("import_batches").update(updatePayload).eq("id", batchId);

    // Final report on last batch
    let finalReport = null;
    if (isLast) {
      const totalUpdated = (currentBatch?.updated_count ?? 0) + updated;
      const totalSkipped = (currentBatch?.skipped_count ?? 0) + skipped;
      const totalErrors = (currentBatch?.error_count ?? 0) + errors.length;

      const [{ count: externalImageCount }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).like("main_image_url", "%strongnailbits.com.ua%"),
      ]);

      const recommendations: Array<{ type: string; message: string }> = [];
      if (totalErrors > 0) recommendations.push({ type: "warning", message: `${totalErrors} рядків з помилками` });
      if ((externalImageCount ?? 0) > 0) {
        recommendations.push({ type: "warning", message: `${externalImageCount} товарів з фото на strongnailbits.com.ua — потрібна міграція` });
      }

      finalReport = {
        total_imported: totalUpdated,
        new_products: 0,
        updated_products: totalUpdated,
        skipped: totalSkipped,
        price_changes: { average_change_percent: 0, increased_above_15: 0, decreased_above_20: 0, below_cost: 0 },
        stock_changes: { went_out_of_stock: 0, back_in_stock: 0 },
        recommendations,
        external_image_count: externalImageCount ?? 0,
      };
    }

    return NextResponse.json({
      ok: true,
      created: 0,
      updated,
      skipped,
      errors: errors.length,
      report: finalReport,
    });
  } catch (err) {
    console.error("[execute-batch]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Batch execution failed" },
      { status: 500 },
    );
  }
}
