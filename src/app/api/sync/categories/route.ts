import { NextRequest, NextResponse } from "next/server";
import { syncCategories } from "@/lib/sync/categories";

export const maxDuration = 60; // Vercel timeout (секунди)
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

  const force = request.nextUrl.searchParams.get("force") === "true";

  try {
    const result = await syncCategories({ force });

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
