/**
 * Nova Poshta — Sync Engine (V2)
 *
 * Cities: v2.0 getCities → np_cities
 * Warehouses: v1.0 /divisions archive (base.json.gz) → np_warehouses
 *
 * Runs daily via cron (04:00 UTC = 06:00 Kyiv).
 * Order: cities first → warehouses second.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getAllCities, getDivisionsArchiveUrl, getDivisionsByCity, mapDivisionCategory } from "./client";
import type { NPCity } from "./types";
import type { NPDivision } from "./client";

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

// ────── Sync Cities (v2.0) ──────

export async function syncCities(): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    entity: "cities", status: "completed",
    totalCount: 0, upserted: 0, deleted: 0, durationMs: 0,
  };

  try {
    const supabase = createAdminClient();
    await logSync({ ...result, status: "started" as SyncResult["status"] });

    const cities = await getAllCities();
    result.totalCount = cities.length;

    // Only cities with delivery
    const withDelivery = cities.filter(
      (c: NPCity) => c.Delivery1 === "1" || c.Delivery3 === "1" || c.Delivery7 === "1",
    );

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

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("np_cities").upsert(batch, { onConflict: "ref" });
      if (error) {
        console.error(`[NP Sync] Cities batch ${i}:`, error.message);
      } else {
        result.upserted += batch.length;
      }
    }

    console.log(`[NP Sync] Cities: ${result.upserted}/${result.totalCount}`);
  } catch (err) {
    result.status = "failed";
    result.error = err instanceof Error ? err.message : String(err);
    console.error("[NP Sync] Cities failed:", result.error);
  }

  result.durationMs = Date.now() - start;
  await logSync(result);
  return result;
}

// ────── Sync Warehouses (v1.0 archive) ──────

/**
 * Transform a v1.0 division to our DB row format.
 */
function divisionToRow(d: NPDivision) {
  return {
    np_id: d.id,
    city_name: d.settlement?.name || "",
    settlement_id: d.settlement?.id || null,
    name_ua: d.name,
    short_name: d.shortName || d.name,
    number: d.number || "",
    address: d.address || "",
    category: mapDivisionCategory(d.divisionCategory),
    status: d.status || "Working",
    latitude: d.latitude || null,
    longitude: d.longitude || null,
    schedule: d.workSchedule || [],
    country_code: d.countryCode || "UA",
    region_name: d.settlement?.region?.name || "",
    is_active: d.status === "Working",
  };
}

/**
 * Sync warehouses via v1.0 archive (base.json.gz).
 * Fallback: paginated API calls.
 */
export async function syncWarehouses(): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    entity: "warehouses", status: "completed",
    totalCount: 0, upserted: 0, deleted: 0, durationMs: 0,
  };

  try {
    const supabase = createAdminClient();
    await logSync({ ...result, status: "started" as SyncResult["status"] });

    let allDivisions: NPDivision[] = [];

    // Try archive first
    try {
      console.log("[NP Sync] Trying archive download...");
      const archiveUrl = await getDivisionsArchiveUrl();
      if (archiveUrl) {
        allDivisions = await downloadAndParseArchive(archiveUrl);
        console.log(`[NP Sync] Archive: ${allDivisions.length} total divisions (all countries)`);
      }
    } catch (err) {
      console.warn("[NP Sync] Archive failed, falling back to API:", err instanceof Error ? err.message : err);
    }

    // Fallback: paginated API calls
    if (allDivisions.length === 0) {
      console.log("[NP Sync] Using paginated API fallback...");
      allDivisions = await fetchAllDivisionsPaginated();
    }

    // Filter: only Ukraine
    const uaDivisions = allDivisions.filter((d) => d.countryCode === "UA");
    result.totalCount = uaDivisions.length;
    console.log(`[NP Sync] UA divisions: ${uaDivisions.length}`);

    // Transform to DB rows
    const rows = uaDivisions.map(divisionToRow);

    // Collect all np_ids from the new data
    const newNpIds = new Set(rows.map((r) => r.np_id));

    // Upsert in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("np_warehouses")
        .upsert(batch, { onConflict: "np_id" });
      if (error) {
        console.error(`[NP Sync] Warehouses batch ${i}:`, error.message);
      } else {
        result.upserted += batch.length;
      }
    }

    // Deactivate warehouses not in the new data
    const { data: existing } = await supabase
      .from("np_warehouses")
      .select("np_id")
      .eq("is_active", true)
      .eq("country_code", "UA");

    if (existing) {
      const toDeactivate = existing
        .filter((e) => !newNpIds.has(e.np_id))
        .map((e) => e.np_id);

      if (toDeactivate.length > 0) {
        for (let i = 0; i < toDeactivate.length; i += BATCH_SIZE) {
          const batch = toDeactivate.slice(i, i + BATCH_SIZE);
          await supabase
            .from("np_warehouses")
            .update({ is_active: false })
            .in("np_id", batch);
        }
        result.deleted = toDeactivate.length;
        console.log(`[NP Sync] Deactivated ${toDeactivate.length} warehouses`);
      }
    }

    console.log(`[NP Sync] Warehouses: ${result.upserted} synced, ${result.deleted} deactivated`);
  } catch (err) {
    result.status = "failed";
    result.error = err instanceof Error ? err.message : String(err);
    console.error("[NP Sync] Warehouses failed:", result.error);
  }

  result.durationMs = Date.now() - start;
  await logSync(result);
  return result;
}

/**
 * Download and parse the gzip archive of all divisions.
 */
async function downloadAndParseArchive(url: string): Promise<NPDivision[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Archive download HTTP ${res.status}`);

  // The response is gzip compressed — fetch automatically decompresses
  // If the URL ends with .json.gz, the server sends it with Content-Encoding: gzip
  const data = await res.json();

  if (Array.isArray(data)) {
    return data as NPDivision[];
  }

  throw new Error("Archive format unexpected: not an array");
}

/**
 * Fallback: fetch all UA divisions via paginated API calls.
 */
async function fetchAllDivisionsPaginated(): Promise<NPDivision[]> {
  const all: NPDivision[] = [];
  let page = 1;

  while (true) {
    try {
      // Fetch all UA divisions page by page (no city filter)
      const divisions = await getDivisionsByCity("*", null, 100, page);
      if (!divisions || divisions.length === 0) break;
      all.push(...divisions);
      if (divisions.length < 100) break;
      page++;
      if (page > 500) break; // Safety: ~50k/100 = 500 pages max
    } catch (err) {
      console.error(`[NP Sync] Paginated fetch page ${page} failed:`, err);
      break;
    }
  }

  return all;
}

// ────── Sync All ──────

export interface SyncAllResult {
  cities: SyncResult;
  warehouses: SyncResult;
  totalDurationMs: number;
}

export async function syncAll(): Promise<SyncAllResult> {
  const start = Date.now();
  console.log("[NP Sync] Starting full sync...");

  const cities = await syncCities();
  const warehouses = await syncWarehouses();

  const totalDurationMs = Date.now() - start;
  console.log(
    `[NP Sync] Done in ${(totalDurationMs / 1000).toFixed(1)}s — ` +
    `${cities.upserted} cities, ${warehouses.upserted} warehouses`,
  );

  return { cities, warehouses, totalDurationMs };
}

// ────── Log ──────

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
  } catch { /* silent */ }
}
