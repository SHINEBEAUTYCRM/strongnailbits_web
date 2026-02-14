/**
 * Nova Poshta — City / Settlement Search (V2)
 *
 * GET /api/nova-poshta/cities?q=Оде       → search
 * GET /api/nova-poshta/cities?popular=1    → top cities
 *
 * Returns:
 * - name: city name (for v1.0 /divisions warehouse search)
 * - ref: settlement ref (for v2.0 street search)
 * - deliveryCityRef: city ref (for v2.0 cost calculation)
 *
 * IMPORTANT: Warehouses use city NAME (v1.0), cost uses cityRef (v2.0).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchSettlements } from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

/** Popular city names — searched via NP API at runtime */
const POPULAR_CITY_NAMES = [
  "Київ", "Одеса", "Харків", "Дніпро", "Запоріжжя",
  "Львів", "Полтава", "Вінниця", "Миколаїв", "Чернівці",
];

/** Cache popular cities for 1 hour */
let _popularCache: { data: unknown[]; time: number } | null = null;
const POPULAR_TTL = 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    // Popular cities
    if (req.nextUrl.searchParams.get("popular")) {
      if (_popularCache && Date.now() - _popularCache.time < POPULAR_TTL) {
        return NextResponse.json({ cities: _popularCache.data });
      }

      try {
        const results = await Promise.all(
          POPULAR_CITY_NAMES.map(async (name) => {
            try {
              const settlements = await searchSettlements(name, 1);
              if (settlements.length > 0) {
                const s = settlements[0];
                return {
                  ref: s.Ref,
                  deliveryCityRef: s.DeliveryCity,
                  name: s.MainDescription,
                  area: s.Area,
                  type: s.SettlementTypeCode,
                  warehouses: s.Warehouses,
                };
              }
            } catch (err) { console.error('[API:NP:Cities] Settlement parse error:', err); }
            return null;
          }),
        );

        const cities = results.filter(Boolean);
        _popularCache = { data: cities, time: Date.now() };
        return NextResponse.json({ cities });
      } catch (err) {
        console.error('[API:NP:Cities] Popular cities fetch failed:', err);
        return NextResponse.json({ cities: [] });
      }
    }

    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 1) {
      return NextResponse.json({ cities: [] });
    }

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 15, 50);

    // 1. Try Supabase first (fast search over synced cities)
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
        // Supabase has city refs from getCities, but we also need settlement refs
        // For now, return what we have — warehouse search uses city NAME anyway
        return NextResponse.json({
          cities: data.map((c: { ref: string; name_ua: string; name_ru: string; area_ua: string; settlement_type: string }) => ({
            ref: c.ref,              // City ref (from getCities)
            deliveryCityRef: c.ref,  // Same ref for cost calculation
            name: c.name_ua,         // City name (for warehouse search!)
            nameRu: c.name_ru,
            area: c.area_ua,
            type: c.settlement_type,
            label: [c.name_ua, c.area_ua ? `${c.area_ua} обл.` : ""].filter(Boolean).join(", "),
          })),
          source: "supabase",
        });
      }
    } catch (err) {
      console.error('[API:NP:Cities] Supabase search failed, fallback to NP API:', err);
    }

    // 2. Fallback: NP API searchSettlements
    const settlements = await searchSettlements(q, limit);

    return NextResponse.json({
      cities: settlements.map((s) => ({
        ref: s.Ref,
        deliveryCityRef: s.DeliveryCity,
        name: s.MainDescription,
        area: s.Area,
        region: s.Region,
        type: s.SettlementTypeCode,
        warehouses: s.Warehouses,
        label: [s.MainDescription, s.Area ? `${s.Area} обл.` : "", s.Region || ""]
          .filter(Boolean).join(", "),
      })),
      source: "np_api",
    });
  } catch (err) {
    console.error("[NP Cities]", err);
    return NextResponse.json({ error: "Помилка пошуку міста" }, { status: 500 });
  }
}
