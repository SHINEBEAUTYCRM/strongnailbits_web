/**
 * Nova Poshta — Street Search
 * GET /api/nova-poshta/streets?cityRef=xxx&q=Хрещатик
 */

import { NextRequest, NextResponse } from "next/server";
import { searchStreets } from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cityRef = req.nextUrl.searchParams.get("cityRef");
    const q = req.nextUrl.searchParams.get("q")?.trim();

    if (!cityRef) {
      return NextResponse.json(
        { error: "cityRef is required" },
        { status: 400 },
      );
    }
    if (!q || q.length < 2) {
      return NextResponse.json({ streets: [] });
    }

    const streets = await searchStreets(cityRef, q);

    return NextResponse.json({
      streets: streets.map((s) => ({
        ref: s.Ref,
        name: s.Description,
        type: s.StreetsTypeDescription,
      })),
    });
  } catch (err) {
    console.error("[NP Streets]", err);
    return NextResponse.json(
      { error: "Помилка пошуку вулиці" },
      { status: 500 },
    );
  }
}
