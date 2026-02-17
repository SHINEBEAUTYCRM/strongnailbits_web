/**
 * Nova Poshta — Delivery Cost Calculator
 *
 * GET /api/nova-poshta/calculate?cityRef=xxx&weight=0.5&cost=500&serviceType=WarehouseWarehouse
 * POST /api/nova-poshta/calculate (same params in body)
 *
 * Runtime: NOT Edge (calls external NP API)
 */

import { NextRequest, NextResponse } from "next/server";
import { calculateDelivery, getDeliveryDate, SENDER_CITY_REF } from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

async function handle(params: {
  cityRef: string;
  weight: number;
  cost: number;
  serviceType: string;
}) {
  const { cityRef, weight, cost, serviceType } = params;

  if (!cityRef) {
    return NextResponse.json({ error: "cityRef is required" }, { status: 400 });
  }

  // Parallel: cost + delivery date
  const [priceResult, deliveryDate] = await Promise.all([
    calculateDelivery({
      citySenderRef: SENDER_CITY_REF,
      cityRecipientRef: cityRef,
      weight: weight || 1,
      cost: cost || 300,
      serviceType: (serviceType || "WarehouseWarehouse") as "WarehouseWarehouse" | "WarehouseDoors",
    }),
    getDeliveryDate(
      SENDER_CITY_REF,
      cityRef,
      serviceType || "WarehouseWarehouse",
    ).catch(() => null),
  ]);

  if (!priceResult) {
    return NextResponse.json(
      { error: "Не вдалося розрахувати вартість" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    cost: priceResult.Cost,
    estimatedDate: priceResult.EstimatedDeliveryDate || deliveryDate,
    redeliveryCost: priceResult.CostRedelivery,
    assessedCost: priceResult.AssessedCost,
    costPack: priceResult.CostPack,
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handle({
      cityRef: req.nextUrl.searchParams.get("cityRef") || "",
      weight: Number(req.nextUrl.searchParams.get("weight")) || 1,
      cost: Number(req.nextUrl.searchParams.get("cost")) || 300,
      serviceType: req.nextUrl.searchParams.get("serviceType") || "WarehouseWarehouse",
    });
  } catch (err) {
    console.error("[NP Calculate]", err);
    return NextResponse.json({ error: "Помилка розрахунку" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return await handle({
      cityRef: body.cityRecipientRef || body.cityRef || "",
      weight: body.weight || 1,
      cost: body.cost || 300,
      serviceType: body.serviceType || "WarehouseWarehouse",
    });
  } catch (err) {
    console.error("[NP Calculate]", err);
    return NextResponse.json({ error: "Помилка розрахунку" }, { status: 500 });
  }
}
