import { NextRequest, NextResponse } from "next/server";
import {
  syncFeatures,
  syncFeatureVariants,
  syncProductFeatures,
} from "@/lib/sync/features";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

  try {
    const featuresResult = await syncFeatures();
    if (featuresResult.status === "failed") {
      return NextResponse.json(
        { features: featuresResult, variants: null, product_features: null },
        { status: 500 },
      );
    }

    const variantsResult = await syncFeatureVariants();
    if (variantsResult.status === "failed") {
      return NextResponse.json(
        { features: featuresResult, variants: variantsResult, product_features: null },
        { status: 500 },
      );
    }

    const pfResult = await syncProductFeatures();

    return NextResponse.json(
      { features: featuresResult, variants: variantsResult, product_features: pfResult },
      { status: pfResult.status === "completed" ? 200 : 500 },
    );
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
