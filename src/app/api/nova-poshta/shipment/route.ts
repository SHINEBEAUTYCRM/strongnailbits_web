/**
 * Nova Poshta — Create Shipment (TTN)
 * POST /api/nova-poshta/shipment
 *
 * Admin-only: creates a new shipment and returns TTN number.
 */

import { NextRequest, NextResponse } from "next/server";
import { createShipment, getStatusLabel } from "@/lib/novaposhta/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orderId,
      recipientName,
      recipientPhone,
      recipientCityRef,
      recipientAddressRef,
      serviceType,
      weight,
      cost,
      description,
      seatsAmount,
      payerType,
      paymentMethod,
      backwardDelivery,
    } = body;

    if (!recipientName || !recipientPhone || !recipientCityRef || !recipientAddressRef) {
      return NextResponse.json(
        { error: "Заповніть всі обов'язкові поля" },
        { status: 400 },
      );
    }

    const result = await createShipment({
      recipientName,
      recipientPhone,
      recipientCityRef,
      recipientAddressRef,
      serviceType: serviceType || "WarehouseWarehouse",
      weight: weight || 1,
      cost: cost || 300,
      description: description || "Косметика для нігтів",
      seatsAmount,
      payerType,
      paymentMethod,
      backwardDelivery,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Не вдалося створити ТТН. Перевірте дані відправника." },
        { status: 400 },
      );
    }

    // If orderId provided — update order with TTN
    if (orderId) {
      try {
        const supabase = createAdminClient();
        await supabase
          .from("orders")
          .update({
            ttn: result.IntDocNumber,
            status: "processing",
            shipped_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      } catch (err) {
        console.error("[NP Shipment] Order update error:", err);
      }
    }

    return NextResponse.json({
      ttn: result.IntDocNumber,
      ref: result.Ref,
      cost: result.CostOnSite,
      estimatedDate: result.EstimatedDeliveryDate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Помилка створення ТТН";
    console.error("[NP Shipment]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/nova-poshta/shipment/sender — Get sender info for setup
 */
