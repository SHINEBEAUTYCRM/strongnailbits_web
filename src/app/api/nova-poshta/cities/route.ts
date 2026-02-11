/**
 * Nova Poshta — City Search
 *
 * GET /api/nova-poshta/cities?q=Оде       → search (Supabase RPC)
 * GET /api/nova-poshta/cities?popular=1    → top cities
 *
 * Runtime: Edge (reads from Supabase for <50ms responses)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchCities } from "@/lib/novaposhta/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/** Popular cities with pre-known Refs */
const POPULAR_CITIES = [
  { ref: "8d5a980d-391b-11dd-90d9-001a92567626", name: "Київ", area: "Київська", type: "місто" },
  { ref: "db5c88e0-391a-11dd-90d9-001a92567626", name: "Одеса", area: "Одеська", type: "місто" },
  { ref: "db5c88d0-391a-11dd-90d9-001a92567626", name: "Харків", area: "Харківська", type: "місто" },
  { ref: "db5c88f0-391a-11dd-90d9-001a92567626", name: "Дніпро", area: "Дніпропетровська", type: "місто" },
  { ref: "db5c8892-391a-11dd-90d9-001a92567626", name: "Запоріжжя", area: "Запорізька", type: "місто" },
  { ref: "db5c88c6-391a-11dd-90d9-001a92567626", name: "Львів", area: "Львівська", type: "місто" },
  { ref: "db5c88de-391a-11dd-90d9-001a92567626", name: "Полтава", area: "Полтавська", type: "місто" },
  { ref: "db5c88ac-391a-11dd-90d9-001a92567626", name: "Вінниця", area: "Вінницька", type: "місто" },
  { ref: "db5c88ce-391a-11dd-90d9-001a92567626", name: "Миколаїв", area: "Миколаївська", type: "місто" },
  { ref: "db5c8904-391a-11dd-90d9-001a92567626", name: "Чернівці", area: "Чернівецька", type: "місто" },
];

export async function GET(req: NextRequest) {
  try {
    // Popular cities — static, instant
    if (req.nextUrl.searchParams.get("popular")) {
      return NextResponse.json({ cities: POPULAR_CITIES });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 1) {
      return NextResponse.json({ cities: [] });
    }

    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 15,
      50,
    );

    // 1. Try Supabase RPC (fast, <50ms)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const { data, error } = await supabase.rpc("search_np_cities", {
        query: q,
        max_results: limit,
      });

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          cities: data.map((c: { ref: string; name_ua: string; name_ru: string; area_ua: string; settlement_type: string }) => ({
            ref: c.ref,
            name: c.name_ua,
            nameRu: c.name_ru,
            area: c.area_ua,
            type: c.settlement_type,
            label: [c.name_ua, c.area_ua ? `${c.area_ua} обл.` : ""].filter(Boolean).join(", "),
          })),
          source: "supabase",
        });
      }
    } catch {
      // Supabase not available or table doesn't exist yet — fallback
    }

    // 2. Fallback: NP API direct
    const cities = await searchCities(q, limit);

    return NextResponse.json({
      cities: cities.map((c) => ({
        ref: c.Ref,
        name: c.Description,
        nameRu: c.DescriptionRu,
        area: c.AreaDescription,
        type: c.SettlementTypeDescription,
        label: [c.Description, c.AreaDescription ? `${c.AreaDescription} обл.` : ""].filter(Boolean).join(", "),
      })),
      source: "np_api",
    });
  } catch (err) {
    console.error("[NP Cities]", err);
    return NextResponse.json(
      { error: "Помилка пошуку міста" },
      { status: 500 },
    );
  }
}
