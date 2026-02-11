/**
 * Nova Poshta — City / Settlement Search
 *
 * GET /api/nova-poshta/cities?q=Оде       → search (NP API searchSettlements)
 * GET /api/nova-poshta/cities?popular=1    → top cities (dynamic via NP API)
 *
 * IMPORTANT: Returns SETTLEMENT refs (not city refs!).
 * The `ref` field = settlement ref → use with getWarehouses(SettlementRef).
 * The `deliveryCityRef` field = city ref → use with calculateDelivery.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchSettlements } from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

/**
 * Popular city names — we search them via NP API at runtime
 * to get correct settlement refs (not hardcoded UUIDs).
 */
const POPULAR_CITY_NAMES = [
  "Київ",
  "Одеса",
  "Харків",
  "Дніпро",
  "Запоріжжя",
  "Львів",
  "Полтава",
  "Вінниця",
  "Миколаїв",
  "Чернівці",
];

/** Cache popular cities for 1 hour */
let _popularCache: { data: unknown[]; time: number } | null = null;
const POPULAR_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
  try {
    // Popular cities — resolved dynamically, cached in memory
    if (req.nextUrl.searchParams.get("popular")) {
      if (_popularCache && Date.now() - _popularCache.time < POPULAR_TTL) {
        return NextResponse.json({ cities: _popularCache.data });
      }

      try {
        // Search each popular city and take the first result
        const results = await Promise.all(
          POPULAR_CITY_NAMES.map(async (name) => {
            try {
              const settlements = await searchSettlements(name, 1);
              if (settlements.length > 0) {
                const s = settlements[0];
                return {
                  ref: s.Ref,              // Settlement ref!
                  deliveryCityRef: s.DeliveryCity,
                  name: s.MainDescription,
                  area: s.Area,
                  type: s.SettlementTypeCode,
                  warehouses: s.Warehouses,
                };
              }
            } catch {
              // Skip failed city
            }
            return null;
          }),
        );

        const cities = results.filter(Boolean);
        _popularCache = { data: cities, time: Date.now() };
        return NextResponse.json({ cities });
      } catch {
        // If NP API is down, return empty
        return NextResponse.json({ cities: [] });
      }
    }

    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 1) {
      return NextResponse.json({ cities: [] });
    }

    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 15,
      50,
    );

    // Search settlements via NP API (returns settlement refs)
    const settlements = await searchSettlements(q, limit);

    return NextResponse.json({
      cities: settlements.map((s) => ({
        ref: s.Ref,                // Settlement ref (for getWarehouses!)
        deliveryCityRef: s.DeliveryCity, // City ref (for calculateDelivery!)
        name: s.MainDescription,
        area: s.Area,
        region: s.Region,
        type: s.SettlementTypeCode,
        warehouses: s.Warehouses,
        label: [
          s.MainDescription,
          s.Area ? `${s.Area} обл.` : "",
          s.Region || "",
        ].filter(Boolean).join(", "),
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
