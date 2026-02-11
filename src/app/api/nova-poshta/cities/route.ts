/**
 * Nova Poshta — City Search
 * GET /api/nova-poshta/cities?q=Київ
 */

import { NextRequest, NextResponse } from "next/server";
import { searchCities } from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ cities: [] });
    }

    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 20,
      50,
    );

    const cities = await searchCities(q, limit);

    // Return simplified format for frontend
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
