/**
 * Nova Poshta — Warehouse Search (V2)
 *
 * GET /api/nova-poshta/warehouses?city=Одеса&type=branch
 * GET /api/nova-poshta/warehouses?city=Одеса&type=postomat
 * GET /api/nova-poshta/warehouses?city=Одеса&q=5
 *
 * NOTE: Uses city NAME (not cityRef!) because v1.0 API works with names.
 * Strategy: Supabase RPC first → v1.0 /divisions fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDivisionsByCity, mapDivisionCategory } from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

const CATEGORY_API_MAP: Record<string, string> = {
  branch: "PostBranch",
  warehouse: "PostBranch",
  postomat: "Postomat",
  parcel: "Postomat",
  cargo: "CargoBranch",
};

export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get("city");
    if (!city) {
      return NextResponse.json({ error: "city parameter is required" }, { status: 400 });
    }

    const rawType = req.nextUrl.searchParams.get("type") || "";
    const categoryFilter = rawType === "branch" || rawType === "warehouse"
      ? "branch"
      : rawType === "postomat" || rawType === "parcel"
        ? "postomat"
        : rawType === "cargo"
          ? "cargo"
          : null;
    const q = req.nextUrl.searchParams.get("q") || "";
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 200, 500);

    // 1. Try Supabase RPC (fast, <50ms)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const { data, error } = await supabase.rpc("search_np_warehouses", {
        city,
        category_filter: categoryFilter,
        search_query: q || null,
        max_results: limit,
      });

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          warehouses: data.map((w: Record<string, unknown>) => ({
            id: w.np_id,
            name: w.name_ua,
            shortName: w.short_name,
            number: w.number,
            address: w.address,
            category: w.category,
            latitude: w.latitude,
            longitude: w.longitude,
            schedule: w.schedule,
            status: w.status,
          })),
          total: data.length,
          source: "supabase",
        });
      }
    } catch {
      // Supabase not available — fallback
    }

    // 2. Fallback: v1.0 /divisions API
    const apiCategory = rawType ? CATEGORY_API_MAP[rawType] || null : null;
    const divisions = await getDivisionsByCity(city, apiCategory, limit);

    let filtered = divisions;
    if (q) {
      const qLower = q.toLowerCase();
      filtered = divisions.filter((d) =>
        d.number === q ||
        d.name.toLowerCase().includes(qLower) ||
        d.address?.toLowerCase().includes(qLower),
      );
    }

    return NextResponse.json({
      warehouses: filtered.map((d) => ({
        id: d.id,
        name: d.name,
        shortName: d.shortName,
        number: d.number,
        address: d.address,
        category: mapDivisionCategory(d.divisionCategory),
        latitude: d.latitude,
        longitude: d.longitude,
        schedule: d.workSchedule,
        status: d.status,
      })),
      total: filtered.length,
      source: "np_api_v1",
    });
  } catch (err) {
    console.error("[NP Warehouses]", err);
    return NextResponse.json(
      { error: "Помилка завантаження відділень" },
      { status: 500 },
    );
  }
}
