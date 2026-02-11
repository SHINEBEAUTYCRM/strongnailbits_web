/**
 * Nova Poshta — Sync Engine
 *
 * Downloads ALL cities & warehouses from NP API → upserts into Supabase.
 * Runs daily via cron (04:00 UTC = 06:00 Kyiv).
 *
 * Order matters: warehouse_types → cities → warehouses (FK dependency).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getAllCities, getAllWarehouses, getWarehouseTypes } from "./client";
import type { NPCity, NPWarehouse, NPWarehouseType } from "./types";

const BATCH_SIZE = 500;

interface SyncResult {
  entity: string;
  status: "completed" | "failed";
  totalCount: number;
  upserted: number;
  deleted: number;
  durationMs: number;
  error?: string;
}

// ────── Sync Warehouse Types ──────

export async function syncWarehouseTypes(): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    entity: "warehouse_types",
    status: "completed",
    totalCount: 0,
    upserted: 0,
    deleted: 0,
    durationMs: 0,
  };

  try {
    const supabase = createAdminClient();
    const types = await getWarehouseTypes();
    result.totalCount = types.length;

    if (types.length === 0) {
      result.durationMs = Date.now() - start;
      return result;
    }

    const rows = types.map((t: NPWarehouseType) => ({
      ref: t.Ref,
      description_ua: t.Description,
      description_ru: t.DescriptionRu || "",
    }));

    const { error } = await supabase
      .from("np_warehouse_types")
      .upsert(rows, { onConflict: "ref" });

    if (error) throw error;
    result.upserted = rows.length;
  } catch (err) {
    result.status = "failed";
    result.error = err instanceof Error ? err.message : String(err);
  }

  result.durationMs = Date.now() - start;
  await logSync(result);
  return result;
}

// ────── Sync Cities ──────

export async function syncCities(): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    entity: "cities",
    status: "completed",
    totalCount: 0,
    upserted: 0,
    deleted: 0,
    durationMs: 0,
  };

  try {
    const supabase = createAdminClient();

    // Log start
    await logSync({ ...result, status: "started" as SyncResult["status"] });

    const cities = await getAllCities();
    result.totalCount = cities.length;

    // Filter: only cities with delivery
    const withDelivery = cities.filter(
      (c: NPCity) => c.Delivery1 === "1" || c.Delivery3 === "1" || c.Delivery7 === "1",
    );

    // Transform to DB format
    const rows = withDelivery.map((c: NPCity) => ({
      ref: c.Ref,
      name_ua: c.Description,
      name_ru: c.DescriptionRu || "",
      area_ua: c.AreaDescription || "",
      area_ru: c.AreaDescriptionRu || "",
      settlement_type: c.SettlementTypeDescription || "місто",
      city_id: c.CityID || "",
      has_delivery: true,
    }));

    // Upsert in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("np_cities")
        .upsert(batch, { onConflict: "ref" });

      if (error) {
        console.error(`[NP Sync] Cities batch ${i}:`, error.message);
        // Continue with next batch
      } else {
        result.upserted += batch.length;
      }
    }

    console.log(`[NP Sync] Cities: ${result.upserted}/${result.totalCount} synced`);
  } catch (err) {
    result.status = "failed";
    result.error = err instanceof Error ? err.message : String(err);
    console.error("[NP Sync] Cities failed:", result.error);
  }

  result.durationMs = Date.now() - start;
  await logSync(result);
  return result;
}

// ────── Sync Warehouses ──────

/**
 * Determine warehouse category from NP data.
 */
function categorizeWarehouse(w: NPWarehouse): "branch" | "postomat" | "cargo" {
  if (w.CategoryOfWarehouse === "Postomat") return "postomat";
  if (w.PostMachineType && w.PostMachineType !== "None" && w.PostMachineType !== "") {
    return "postomat";
  }
  const desc = (w.Description || "").toLowerCase();
  if (desc.includes("вантаж") || desc.includes("cargo")) return "cargo";
  return "branch";
}

export async function syncWarehouses(): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    entity: "warehouses",
    status: "completed",
    totalCount: 0,
    upserted: 0,
    deleted: 0,
    durationMs: 0,
  };

  try {
    const supabase = createAdminClient();

    await logSync({ ...result, status: "started" as SyncResult["status"] });

    // Get all known city refs to avoid FK violations
    const { data: knownCities } = await supabase
      .from("np_cities")
      .select("ref");
    const cityRefSet = new Set((knownCities || []).map((c) => c.ref));

    const warehouses = await getAllWarehouses();
    result.totalCount = warehouses.length;

    // Transform and filter
    const rows: Record<string, unknown>[] = [];
    let skippedFK = 0;

    for (const w of warehouses) {
      // Skip if city doesn't exist (FK violation prevention)
      if (!cityRefSet.has(w.CityRef)) {
        skippedFK++;
        continue;
      }

      rows.push({
        ref: w.Ref,
        city_ref: w.CityRef,
        name_ua: w.Description,
        name_ru: w.DescriptionRu || "",
        short_address_ua: w.ShortAddress || "",
        short_address_ru: w.ShortAddressRu || "",
        number: parseInt(w.Number, 10) || 0,
        type_ref: w.TypeOfWarehouse || "",
        category: categorizeWarehouse(w),
        latitude: w.Latitude ? parseFloat(String(w.Latitude)) : null,
        longitude: w.Longitude ? parseFloat(String(w.Longitude)) : null,
        phone: w.Phone || "",
        schedule: w.Schedule || {},
        max_weight: w.TotalMaxWeightAllowed || w.PlaceMaxWeightAllowed || 30,
        has_pos: w.POSTerminal === "1",
        has_postfinance: w.PostFinance === "1",
        is_active: w.WarehouseStatus === "Working",
      });
    }

    if (skippedFK > 0) {
      console.log(`[NP Sync] Warehouses: skipped ${skippedFK} due to missing city_ref`);
    }

    // Upsert in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("np_warehouses")
        .upsert(batch, { onConflict: "ref" });

      if (error) {
        console.error(`[NP Sync] Warehouses batch ${i}:`, error.message);
      } else {
        result.upserted += batch.length;
      }
    }

    console.log(
      `[NP Sync] Warehouses: ${result.upserted}/${result.totalCount} synced (${skippedFK} skipped FK)`,
    );
  } catch (err) {
    result.status = "failed";
    result.error = err instanceof Error ? err.message : String(err);
    console.error("[NP Sync] Warehouses failed:", result.error);
  }

  result.durationMs = Date.now() - start;
  await logSync(result);
  return result;
}

// ────── Sync All ──────

export interface SyncAllResult {
  warehouseTypes: SyncResult;
  cities: SyncResult;
  warehouses: SyncResult;
  totalDurationMs: number;
}

/**
 * Full sync: types → cities → warehouses (order matters for FK).
 */
export async function syncAll(): Promise<SyncAllResult> {
  const start = Date.now();

  console.log("[NP Sync] Starting full sync...");

  // 1. Warehouse types first (needed for categorization reference)
  const warehouseTypes = await syncWarehouseTypes();

  // 2. Cities (needed for warehouse FK)
  const cities = await syncCities();

  // 3. Warehouses (depends on cities)
  const warehouses = await syncWarehouses();

  const totalDurationMs = Date.now() - start;

  console.log(
    `[NP Sync] Completed in ${(totalDurationMs / 1000).toFixed(1)}s — ` +
    `${cities.upserted} cities, ${warehouses.upserted} warehouses`,
  );

  return { warehouseTypes, cities, warehouses, totalDurationMs };
}

// ────── Sync Log ──────

async function logSync(result: SyncResult & { status: string }): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("np_sync_log").insert({
      entity: result.entity,
      status: result.status,
      total_count: result.totalCount,
      upserted: result.upserted,
      deleted: result.deleted,
      duration_ms: result.durationMs,
      error: result.error || null,
    });
  } catch {
    // Don't fail sync because of logging
  }
}
