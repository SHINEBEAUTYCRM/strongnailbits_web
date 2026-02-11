/**
 * Nova Poshta — Warehouse Search (V2)
 *
 * GET /api/nova-poshta/warehouses?city=Одеса&type=branch
 * GET /api/nova-poshta/warehouses?city=Одеса&type=postomat
 * GET /api/nova-poshta/warehouses?city=Одеса&q=5
 *
 * Uses city NAME (not cityRef!) — v1.0 API works with names.
 * Data comes from Supabase (synced via archive).
 * No live API fallback — v1.0 /divisions requires OAuth token we don't have.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Use RPC function for ranked search
    const { data, error } = await supabase.rpc("search_np_warehouses", {
      city,
      category_filter: categoryFilter,
      search_query: q || null,
      max_results: limit,
    });

    if (error) {
      console.error("[NP Warehouses] Supabase RPC error:", error.message);

      // Fallback: direct query
      let query = supabase
        .from("np_warehouses")
        .select("np_id, name_ua, short_name, number, address, category, latitude, longitude, schedule, status")
        .eq("is_active", true)
        .ilike("city_name", city);

      if (categoryFilter) query = query.eq("category", categoryFilter);
      if (q) {
        query = query.or(`number.eq.${q},name_ua.ilike.%${q}%`);
      }
      query = query.limit(limit);

      const { data: fallbackData, error: fallbackError } = await query;
      if (fallbackError) throw fallbackError;

      return NextResponse.json({
        warehouses: (fallbackData || []).map((w: Record<string, unknown>) => ({
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
        total: fallbackData?.length || 0,
        source: "supabase_fallback",
      });
    }

    return NextResponse.json({
      warehouses: (data || []).map((w: Record<string, unknown>) => ({
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
      total: data?.length || 0,
      source: "supabase",
    });
  } catch (err) {
    console.error("[NP Warehouses]", err);
    return NextResponse.json(
      { error: "Помилка завантаження відділень. Синхронізуйте дані: POST /api/nova-poshta/sync" },
      { status: 500 },
    );
  }
}
