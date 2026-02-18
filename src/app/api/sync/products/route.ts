import { NextRequest, NextResponse } from "next/server";
import { syncProducts } from "@/lib/sync/products";

export const maxDuration = 300; // Vercel timeout (секунди) — 5 хвилин для ~12000 товарів
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

  /* ---- Синхронізація ---- */

  try {
    const result = await syncProducts();

    return NextResponse.json(result, {
      status: result.status === "completed" ? 200 : 500,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Sync failed unexpectedly",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
