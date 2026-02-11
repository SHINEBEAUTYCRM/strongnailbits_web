/**
 * Nova Poshta — Warehouse Search
 * GET /api/nova-poshta/warehouses?cityRef=xxx&type=warehouse&q=5&page=1
 */

import { NextRequest, NextResponse } from "next/server";
import { getWarehouses } from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cityRef = req.nextUrl.searchParams.get("cityRef");
    if (!cityRef) {
      return NextResponse.json(
        { error: "cityRef is required" },
        { status: 400 },
      );
    }

    const type = (req.nextUrl.searchParams.get("type") || "") as
      | "warehouse"
      | "parcel"
      | "cargo"
      | "";
    const search = req.nextUrl.searchParams.get("q") || undefined;
    const page = Number(req.nextUrl.searchParams.get("page")) || 1;
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 50,
      150,
    );

    const { warehouses, total } = await getWarehouses(cityRef, {
      search,
      type: type || "",
      limit,
      page,
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
        type: w.TypeOfWarehouse,
        schedule: w.Schedule,
      })),
      total,
      page,
    });
  } catch (err) {
    console.error("[NP Warehouses]", err);
    return NextResponse.json(
      { error: "Помилка завантаження відділень" },
      { status: 500 },
    );
  }
}
