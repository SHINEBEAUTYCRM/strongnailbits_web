/**
 * Nova Poshta — Sync Cron Endpoint
 *
 * GET  /api/nova-poshta/sync  ← Vercel Cron (daily 04:00 UTC)
 * POST /api/nova-poshta/sync  ← Manual trigger
 *
 * maxDuration: 120s (sync can take up to 60s for 25k records)
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAll, syncCities, syncWarehouses } from "@/lib/novaposhta/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function checkAuth(req: NextRequest): boolean {
  // Vercel Cron sends CRON_SECRET automatically
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Also allow from Vercel Cron (has x-vercel-cron header)
  if (req.headers.get("x-vercel-cron")) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAll();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[NP Sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const entity = body.entity as string | undefined;

    if (entity === "cities") {
      const result = await syncCities();
      return NextResponse.json({ success: true, result });
    }
    if (entity === "warehouses") {
      const result = await syncWarehouses();
      return NextResponse.json({ success: true, result });
    }
    // Default: sync all
    const result = await syncAll();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[NP Sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
