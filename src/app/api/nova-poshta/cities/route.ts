/**
 * Nova Poshta — City Search
 * GET /api/nova-poshta/cities?q=Київ
 * GET /api/nova-poshta/cities?popular=1   — top cities for quick selection
 */

import { NextRequest, NextResponse } from "next/server";
import { searchCities } from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

/** Popular cities with pre-known Refs (fallback if API is slow) */
const POPULAR_CITIES = [
  { ref: "8d5a980d-391b-11dd-90d9-001a92567626", name: "Київ", area: "Київська", region: "", type: "місто" },
  { ref: "db5c88e0-391a-11dd-90d9-001a92567626", name: "Одеса", area: "Одеська", region: "", type: "місто" },
  { ref: "db5c88d0-391a-11dd-90d9-001a92567626", name: "Харків", area: "Харківська", region: "", type: "місто" },
  { ref: "db5c88f0-391a-11dd-90d9-001a92567626", name: "Дніпро", area: "Дніпропетровська", region: "", type: "місто" },
  { ref: "db5c8892-391a-11dd-90d9-001a92567626", name: "Запоріжжя", area: "Запорізька", region: "", type: "місто" },
  { ref: "db5c88c6-391a-11dd-90d9-001a92567626", name: "Львів", area: "Львівська", region: "", type: "місто" },
  { ref: "db5c88de-391a-11dd-90d9-001a92567626", name: "Полтава", area: "Полтавська", region: "", type: "місто" },
  { ref: "db5c88ac-391a-11dd-90d9-001a92567626", name: "Вінниця", area: "Вінницька", region: "", type: "місто" },
  { ref: "db5c88ce-391a-11dd-90d9-001a92567626", name: "Миколаїв", area: "Миколаївська", region: "", type: "місто" },
  { ref: "db5c8904-391a-11dd-90d9-001a92567626", name: "Чернівці", area: "Чернівецька", region: "", type: "місто" },
];

export async function GET(req: NextRequest) {
  try {
    const popular = req.nextUrl.searchParams.get("popular");
    if (popular) {
      return NextResponse.json({ cities: POPULAR_CITIES });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 1) {
      return NextResponse.json({ cities: [] });
    }

    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 20,
      50,
    );

    const cities = await searchCities(q, limit);

    return NextResponse.json({
      cities: cities.map((c) => ({
        ref: c.Ref,
        name: c.Description,
        nameRu: c.DescriptionRu,
        area: c.AreaDescription,
        region: c.RegionsDescription,
        type: c.SettlementTypeDescription,
      })),
    });
  } catch (err) {
    console.error("[NP Cities]", err);
    return NextResponse.json(
      { error: "Помилка пошуку міста" },
      { status: 500 },
    );
  }
}
