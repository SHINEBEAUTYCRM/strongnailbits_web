/**
 * Nova Poshta — Delivery Cost Calculator
 * POST /api/nova-poshta/calculate
 */

import { NextRequest, NextResponse } from "next/server";
import { calculateDelivery } from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      citySenderRef,
      cityRecipientRef,
      weight,
      cost,
      serviceType,
    } = body;

    if (!cityRecipientRef) {
      return NextResponse.json(
        { error: "cityRecipientRef is required" },
        { status: 400 },
      );
    }

    // Use sender city from config or provided
    const senderCity =
      citySenderRef || process.env.NOVAPOSHTA_SENDER_CITY_REF || "";

    const result = await calculateDelivery({
      citySenderRef: senderCity,
      cityRecipientRef,
      weight: weight || 1,
      cost: cost || 300,
      serviceType: serviceType || "WarehouseWarehouse",
    });

    if (!result) {
      return NextResponse.json(
        { error: "Не вдалося розрахувати вартість" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      cost: result.Cost,
      estimatedDate: result.EstimatedDeliveryDate,
      assessedCost: result.AssessedCost,
      costRedelivery: result.CostRedelivery,
      costPack: result.CostPack,
    });
  } catch (err) {
    console.error("[NP Calculate]", err);
    return NextResponse.json(
      { error: "Помилка розрахунку доставки" },
      { status: 500 },
    );
  }
}
