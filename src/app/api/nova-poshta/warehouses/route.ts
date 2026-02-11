/**
 * Nova Poshta — Warehouse Search
 *
 * GET /api/nova-poshta/warehouses?cityRef=xxx&type=branch
 * GET /api/nova-poshta/warehouses?cityRef=xxx&type=postomat
 * GET /api/nova-poshta/warehouses?cityRef=xxx&q=5
 *
 * Runtime: Edge (reads from Supabase with NP API fallback)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWarehouses } from "@/lib/novaposhta/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const categoryMap: Record<string, string> = {
  branch: "branch",
  warehouse: "branch",
  postomat: "postomat",
  parcel: "postomat",
  cargo: "cargo",
};

export async function GET(req: NextRequest) {
  try {
    const cityRef = req.nextUrl.searchParams.get("cityRef");
    if (!cityRef) {
      return NextResponse.json({ error: "cityRef is required" }, { status: 400 });
    }

    const rawType = req.nextUrl.searchParams.get("type") || "";
    const category = categoryMap[rawType] || "";
    const q = req.nextUrl.searchParams.get("q") || "";
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 500,
      500,
    );

    // 1. Try Supabase (fast, <50ms)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      let query = supabase
        .from("np_warehouses")
        .select("ref, city_ref, name_ua, name_ru, short_address_ua, number, category, phone, schedule, max_weight, latitude, longitude")
        .eq("city_ref", cityRef)
        .eq("is_active", true);

      if (category) {
        query = query.eq("category", category);
      }

      // Search: by number or by name
      if (q) {
        const num = parseInt(q, 10);
        if (!isNaN(num) && String(num) === q.trim()) {
          query = query.eq("number", num);
        } else {
          query = query.ilike("name_ua", `%${q}%`);
        }
      }

      query = query.order("number", { ascending: true }).limit(limit);

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          warehouses: data.map((w) => ({
            ref: w.ref,
            number: String(w.number),
            name: w.name_ua,
            nameRu: w.name_ru,
            shortAddress: w.short_address_ua,
            phone: w.phone,
            maxWeight: w.max_weight,
            category: w.category,
            schedule: w.schedule,
            latitude: w.latitude,
            longitude: w.longitude,
          })),
          total: data.length,
          source: "supabase",
        });
      }
    } catch {
      // Supabase not available — fallback
    }

    // 2. Fallback: NP API direct
    const npType = rawType === "postomat" || rawType === "parcel"
      ? "parcel" as const
      : rawType === "cargo"
        ? "cargo" as const
        : "warehouse" as const;

    const { warehouses, total } = await getWarehouses(cityRef, {
      search: q || undefined,
      type: npType,
      limit,
    });

    return NextResponse.json({
      warehouses: warehouses.map((w) => ({
        ref: w.Ref,
        number: w.Number,
        name: w.Description,
        nameRu: w.DescriptionRu,
        shortAddress: w.ShortAddress,
        phone: w.Phone,
        maxWeight: w.PlaceMaxWeightAllowed,
        category: w.CategoryOfWarehouse,
        schedule: w.Schedule,
      })),
      total,
      source: "np_api",
    });
  } catch (err) {
    console.error("[NP Warehouses]", err);
    return NextResponse.json(
      { error: "Помилка завантаження відділень" },
      { status: 500 },
    );
  }
}
