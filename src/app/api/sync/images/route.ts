import { NextRequest, NextResponse } from "next/server";
import { migrateProductImages } from "@/lib/sync/images";

export const maxDuration = 300; // 5 хвилин — Vercel Pro limit
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  /* ---- Авторизація ---- */

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const token = authHeader?.replace("Bearer ", "");

  const isAuthorized =
    (serviceRoleKey && token === serviceRoleKey) ||
    (cronSecret && token === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized. Provide valid Bearer token." },
      { status: 401 },
    );
  }

  /* ---- Параметри ---- */

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "1000", 10);

  if (isNaN(offset) || offset < 0) {
    return NextResponse.json(
      { error: "Invalid offset parameter. Must be a non-negative integer." },
      { status: 400 },
    );
  }

  if (isNaN(limit) || limit < 1 || limit > 10000) {
    return NextResponse.json(
      { error: "Invalid limit parameter. Must be between 1 and 10000." },
      { status: 400 },
    );
  }

  /* ---- Міграція ---- */

  try {
    const result = await migrateProductImages({ offset, limit });

    return NextResponse.json(result, {
      status: result.status === "error" ? 500 : 200,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Image migration failed unexpectedly",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
