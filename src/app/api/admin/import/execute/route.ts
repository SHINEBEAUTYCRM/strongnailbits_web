import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ColumnMapping, DbField, ImportExecuteRequest, PostImportReport } from "@/lib/import-export/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface SnapshotItem {
  id: string;
  action: "created" | "updated";
  previous_data?: Record<string, unknown>;
}

/**
 * POST /api/admin/import/execute
 * Execute the actual import: create/update products in Supabase.
 * Saves a snapshot for rollback support.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  // Create batch record upfront with status 'processing'
  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({
      type: "products",
      status: "processing",
      filename: null as string | null,
      total_rows: 0,
      created_count: 0,
      updated_count: 0,
      skipped_count: 0,
      error_count: 0,
      snapshot: null,
      errors: null,
    })
    .select("id")
    .single();

  if (batchErr || !batch) {
    console.error("[Import Execute] Failed to create batch:", batchErr);
    return NextResponse.json({ error: "Не вдалося створити запис імпорту" }, { status: 500 });
  }

  const batchId: string = batch.id;

  try {
    const body = (await request.json()) as ImportExecuteRequest;
    const {
      mappings,
      structure,
      rows,
      validation_fixes,
      import_mode,
      duplicate_strategy,
      match_field,
    } = body;

    const headers = rows[structure.header_row] ?? [];

    // Update batch with filename
    const filename = (body as unknown as Record<string, unknown>).filename as string | undefined;
    const totalDataRows = rows.length - structure.data_start_row - (structure.skip_rows?.length ?? 0);
    await supabase.from("import_batches").update({ filename: filename ?? null, total_rows: totalDataRows }).eq("id", batchId);

    // Build column index → db_field map
    const fieldMap = new Map<number, DbField>();
    mappings.forEach((m: ColumnMapping) => {
      if (m.db_field) {
        const colIdx = headers.indexOf(m.file_column);
        if (colIdx >= 0) fieldMap.set(colIdx, m.db_field);
      }
    });

    // Build fix map: `${row}-${field}` → fixed value
    const fixMap = new Map<string, string>();
    (validation_fixes ?? []).forEach((fix) => {
      fixMap.set(`${fix.row}-${fix.field}`, fix.value);
    });

    // Fetch existing brands and categories for lookup
    const [{ data: existingBrands }, { data: existingCategories }] = await Promise.all([
      supabase.from("brands").select("id, name"),
      supabase.from("categories").select("id, name_uk, slug"),
    ]);
    const brandMap = new Map((existingBrands ?? []).map((b: { name: string; id: string }) => [b.name.toLowerCase(), b.id]));
    const categoryMap = new Map((existingCategories ?? []).map((c: { name_uk: string; id: string }) => [c.name_uk.toLowerCase(), c.id]));

    // Stats tracking
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const priceChanges: Array<{ name: string; old_price: number; new_price: number }> = [];
    const stockChanges: Array<{ name: string; old_qty: number; new_qty: number }> = [];
    const newBrands: string[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    // Snapshot for rollback
    const snapshotItems: SnapshotItem[] = [];

    // Process rows
    for (let i = structure.data_start_row; i < rows.length; i++) {
      if (structure.skip_rows?.includes(i)) continue;
      const row = rows[i];
      if (!row || row.every((c) => !c)) continue;

      // Build product data from mapped fields
      const productData: Record<string, string | number | null> = {};

      fieldMap.forEach((field, colIdx) => {
        const fixKey = `${i}-${field}`;
        const rawValue = fixMap.has(fixKey) ? fixMap.get(fixKey)! : (row[colIdx] ?? "");
        if (!rawValue) return;

        switch (field) {
          case "price":
          case "wholesale_price":
          case "old_price":
          case "weight":
          case "volume": {
            const num = parseFloat(rawValue.replace(/[^\d.,]/g, "").replace(",", "."));
            if (!isNaN(num)) productData[field] = num;
            break;
          }
          case "quantity": {
            const num = parseInt(rawValue.replace(/[^\d-]/g, ""), 10);
            if (!isNaN(num)) productData[field] = Math.max(0, num);
            break;
          }
          default:
            productData[field] = rawValue;
        }
      });

      // Must have at least a name
      if (!productData.name_uk) {
        skipped++;
        continue;
      }

      // Resolve brand
      let brandId: string | null = null;
      if (productData.brand_name) {
        const brandLower = String(productData.brand_name).toLowerCase();
        brandId = brandMap.get(brandLower) as string ?? null;
        if (!brandId) {
          const { data: newBrand } = await supabase
            .from("brands")
            .insert({ name: String(productData.brand_name), slug: String(productData.brand_name).toLowerCase().replace(/\s+/g, "-") })
            .select("id")
            .single();
          if (newBrand) {
            brandId = newBrand.id as string;
            brandMap.set(brandLower, brandId!);
            newBrands.push(String(productData.brand_name));
          }
        }
      }

      // Resolve category
      let categoryId: string | null = null;
      if (productData.category_path) {
        const catLower = String(productData.category_path).toLowerCase();
        categoryId = categoryMap.get(catLower) as string ?? null;
      }

      // Build upsert data
      const upsertData: Record<string, unknown> = {};
      if (productData.name_uk) upsertData.name_uk = productData.name_uk;
      if (productData.sku) upsertData.sku = productData.sku;
      if (productData.price !== undefined) upsertData.price = productData.price;
      if (productData.wholesale_price !== undefined) upsertData.wholesale_price = productData.wholesale_price;
      if (productData.old_price !== undefined) upsertData.old_price = productData.old_price;
      if (productData.quantity !== undefined) upsertData.quantity = productData.quantity;
      if (productData.description_uk) upsertData.description_uk = productData.description_uk;
      if (productData.weight !== undefined) upsertData.weight = productData.weight;
      if (productData.volume !== undefined) upsertData.volume = productData.volume;
      if (productData.barcode) upsertData.barcode = productData.barcode;
      if (productData.main_image_url) upsertData.main_image_url = productData.main_image_url;
      if (productData.meta_title) upsertData.meta_title = productData.meta_title;
      if (productData.meta_description) upsertData.meta_description = productData.meta_description;
      if (productData.slug) upsertData.slug = productData.slug;
      if (brandId) upsertData.brand_id = brandId;
      if (categoryId) upsertData.category_id = categoryId;

      // Find existing product by match field
      const matchValue = productData[match_field] ?? productData.name_uk;
      let existingProduct: Record<string, unknown> | null = null;

      if (import_mode !== "create") {
        const matchColumn = match_field === "name" ? "name_uk" : match_field;
        const { data: found } = await supabase
          .from("products")
          .select("*")
          .eq(matchColumn, matchValue)
          .limit(1)
          .single();
        existingProduct = found;
      }

      if (existingProduct) {
        if (import_mode === "create") {
          if (duplicate_strategy === "skip") {
            skipped++;
            continue;
          }
          if (duplicate_strategy === "create_new") {
            if (upsertData.sku) {
              upsertData.sku = `${upsertData.sku}-${Date.now().toString(36).slice(-4)}`;
            }
          }
        }

        if (import_mode === "update" || import_mode === "create_or_update" || duplicate_strategy === "update") {
          // Save previous data for rollback
          const previousData: Record<string, unknown> = {};
          for (const key of Object.keys(upsertData)) {
            previousData[key] = existingProduct[key] ?? null;
          }

          const oldPrice = Number(existingProduct.price) || 0;
          const newPrice = Number(upsertData.price) || oldPrice;
          if (upsertData.price && oldPrice !== newPrice) {
            priceChanges.push({ name: String(productData.name_uk), old_price: oldPrice, new_price: newPrice });
          }

          const oldQty = Number(existingProduct.quantity) || 0;
          const newQty = Number(upsertData.quantity) ?? oldQty;
          if (upsertData.quantity !== undefined && oldQty !== newQty) {
            stockChanges.push({ name: String(productData.name_uk), old_qty: oldQty, new_qty: newQty });
          }

          const { error } = await supabase.from("products").update(upsertData).eq("id", existingProduct.id);

          if (error) {
            errors.push({ row: i, error: error.message });
            skipped++;
          } else {
            snapshotItems.push({ id: String(existingProduct.id), action: "updated", previous_data: previousData });
            updated++;
          }
          continue;
        }

        skipped++;
        continue;
      }

      // Create new product
      if (import_mode === "update") {
        skipped++;
        continue;
      }

      if (!upsertData.slug && upsertData.name_uk) {
        upsertData.slug = transliterateSlug(String(upsertData.name_uk));
      }
      if (!upsertData.status) {
        upsertData.status = "active";
      }

      const { data: inserted, error } = await supabase.from("products").insert(upsertData).select("id").single();
      if (error || !inserted) {
        errors.push({ row: i, error: error?.message ?? "insert failed" });
        skipped++;
      } else {
        snapshotItems.push({ id: inserted.id, action: "created" });
        created++;
      }
    }

    // Count products without photo/description
    const [{ count: noPhotoCount }, { count: noDescCount }] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).is("main_image_url", null),
      supabase.from("products").select("id", { count: "exact", head: true }).is("description_uk", null),
    ]);

    const report: PostImportReport = {
      total_imported: created + updated,
      new_products: created,
      updated_products: updated,
      skipped,
      price_changes: {
        average_change_percent: priceChanges.length > 0
          ? Math.round((priceChanges.reduce((sum, c) => sum + ((c.new_price - c.old_price) / c.old_price) * 100, 0) / priceChanges.length) * 10) / 10
          : 0,
        increased_above_15: priceChanges.filter((c) => ((c.new_price - c.old_price) / c.old_price) * 100 > 15).length,
        decreased_above_20: priceChanges.filter((c) => ((c.new_price - c.old_price) / c.old_price) * 100 < -20).length,
        below_cost: 0,
      },
      stock_changes: {
        went_out_of_stock: stockChanges.filter((c) => c.old_qty > 0 && c.new_qty === 0).length,
        back_in_stock: stockChanges.filter((c) => c.old_qty === 0 && c.new_qty > 0).length,
      },
      recommendations: [],
    };

    if (errors.length > 0) {
      report.recommendations.push({ type: "warning", message: `${errors.length} рядків з помилками при імпорті` });
    }
    if (newBrands.length > 0) {
      report.recommendations.push({ type: "info", message: `Створено нові бренди: ${newBrands.join(", ")}` });
    }
    if ((noPhotoCount ?? 0) > 0) {
      report.recommendations.push({ type: "warning", message: `${noPhotoCount} товарів без фото` });
    }
    if ((noDescCount ?? 0) > 0) {
      report.recommendations.push({ type: "info", message: `${noDescCount} товарів без опису` });
    }

    // Save batch with snapshot
    await supabase.from("import_batches").update({
      status: "completed",
      filename: filename ?? null,
      total_rows: totalDataRows,
      created_count: created,
      updated_count: updated,
      skipped_count: skipped,
      error_count: errors.length,
      snapshot: { items: snapshotItems },
      errors: errors.length > 0 ? errors : null,
      completed_at: new Date().toISOString(),
    }).eq("id", batchId);

    return NextResponse.json({
      ok: true,
      report,
      batch_id: batchId,
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    console.error("[Import Execute]", err);
    // Mark batch as failed
    await supabase.from("import_batches").update({ status: "failed" }).eq("id", batchId);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 },
    );
  }
}

function transliterateSlug(text: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye",
    ж: "zh", з: "z", и: "y", і: "i", ї: "yi", й: "y", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
    ю: "yu", я: "ya", ы: "y", э: "e", ё: "yo",
  };
  return text.toLowerCase().split("").map((ch) => map[ch] ?? ch).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);
}
