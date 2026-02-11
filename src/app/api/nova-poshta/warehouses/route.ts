/**
 * Nova Poshta — Warehouse Search
 *
 * GET /api/nova-poshta/warehouses?cityRef=xxx&type=branch
 * GET /api/nova-poshta/warehouses?cityRef=xxx&type=postomat
 * GET /api/nova-poshta/warehouses?cityRef=xxx&q=5
 *
 * NOTE: Despite param name "cityRef", the value is actually a SETTLEMENT ref
 * (from searchSettlements API). This is what getWarehouses needs.
 *
 * Strategy: NP API (reliable) with Supabase cache attempted first
 */

import { NextRequest, NextResponse } from "next/server";
import { getWarehouses } from "@/lib/novaposhta/client";

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
    const settlementRef = req.nextUrl.searchParams.get("cityRef");
    if (!settlementRef) {
      return NextResponse.json({ error: "cityRef is required" }, { status: 400 });
    }

    const rawType = req.nextUrl.searchParams.get("type") || "";
    const q = req.nextUrl.searchParams.get("q") || "";
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 150,
      500,
    );

    // Map frontend type names to NP API types
    const npType = rawType === "postomat" || rawType === "parcel"
      ? "parcel" as const
      : rawType === "cargo"
        ? "cargo" as const
        : "warehouse" as const;

    // Call NP API with SettlementRef (always reliable)
    const { warehouses, total } = await getWarehouses(settlementRef, {
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
        latitude: w.Latitude,
        longitude: w.Longitude,
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
