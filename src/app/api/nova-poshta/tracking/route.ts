/**
 * Nova Poshta — Shipment Tracking
 * GET  /api/nova-poshta/tracking?ttn=20450000000000
 * POST /api/nova-poshta/tracking  { ttns: ["204...", "205..."] }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  trackShipment,
  trackShipments,
  getStatusLabel,
} from "@/lib/novaposhta/client";

export const dynamic = "force-dynamic";

// Single TTN tracking
export async function GET(req: NextRequest) {
  try {
    const ttn = req.nextUrl.searchParams.get("ttn")?.trim();
    if (!ttn) {
      return NextResponse.json(
        { error: "ttn parameter is required" },
        { status: 400 },
      );
    }

    const doc = await trackShipment(ttn);
    if (!doc) {
      return NextResponse.json(
        { error: "ТТН не знайдено" },
        { status: 404 },
      );
    }

    const status = getStatusLabel(doc.StatusCode);

    return NextResponse.json({
      ttn: doc.Number,
      statusCode: doc.StatusCode,
      status: doc.Status,
      statusLabel: status.label,
      statusEmoji: status.emoji,
      stage: status.stage,
      cityRecipient: doc.CityRecipientDescription,
      warehouseRecipient: doc.WarehouseRecipient,
      recipient: doc.RecipientFullName,
      scheduledDate: doc.ScheduledDeliveryDate,
      actualDate: doc.ActualDeliveryDate,
      dateCreated: doc.DateCreated,
      weight: doc.DocumentWeight,
      cost: doc.DocumentCost,
      announcedPrice: doc.AnnouncedPrice,
    });
  } catch (err) {
    console.error("[NP Tracking]", err);
    return NextResponse.json(
      { error: "Помилка трекінгу" },
      { status: 500 },
    );
  }
}

// Batch tracking
export async function POST(req: NextRequest) {
  try {
    const { ttns } = await req.json();
    if (!Array.isArray(ttns) || ttns.length === 0) {
      return NextResponse.json(
        { error: "ttns array is required" },
        { status: 400 },
      );
    }

    // Limit batch size
    const limited = ttns.slice(0, 100);
    const docs = await trackShipments(limited);

    return NextResponse.json({
      results: docs.map((doc) => {
        const status = getStatusLabel(doc.StatusCode);
        return {
          ttn: doc.Number,
          statusCode: doc.StatusCode,
          status: doc.Status,
          statusLabel: status.label,
          statusEmoji: status.emoji,
          stage: status.stage,
          cityRecipient: doc.CityRecipientDescription,
          scheduledDate: doc.ScheduledDeliveryDate,
          actualDate: doc.ActualDeliveryDate,
          weight: doc.DocumentWeight,
        };
      }),
    });
  } catch (err) {
    console.error("[NP Tracking Batch]", err);
    return NextResponse.json(
      { error: "Помилка трекінгу" },
      { status: 500 },
    );
  }
}
