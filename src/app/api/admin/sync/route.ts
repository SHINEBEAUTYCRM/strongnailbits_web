import { NextRequest, NextResponse } from "next/server";
import { syncCategories } from "@/lib/sync/categories";
import { syncBrands } from "@/lib/sync/brands";
import { syncProducts, linkProductsBrands } from "@/lib/sync/products";
import { syncFeatures, syncFeatureVariants, syncProductFeatures } from "@/lib/sync/features";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function runFeaturesPipeline() {
  const featuresResult = await syncFeatures();
  if (featuresResult.errors.length > 0 && featuresResult.synced === 0) {
    return { step: "features", ...featuresResult };
  }
  const variantsResult = await syncFeatureVariants();
  if (variantsResult.errors.length > 0 && variantsResult.synced === 0) {
    return { step: "variants", ...variantsResult, features: featuresResult };
  }
  const pfResult = await syncProductFeatures();
  return {
    entity: "features",
    features: featuresResult,
    variants: variantsResult,
    productFeatures: pfResult,
  };
}

const SYNC_MAP: Record<string, () => Promise<unknown>> = {
  categories: syncCategories,
  brands: syncBrands,
  products: syncProducts,
  "link-brands": linkProductsBrands,
  features: runFeaturesPipeline,
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const { entity } = await request.json();

    if (!entity || !SYNC_MAP[entity]) {
      return NextResponse.json(
        { error: `Invalid entity. Use: ${Object.keys(SYNC_MAP).join(", ")}` },
        { status: 400 }
      );
    }

    const result = await SYNC_MAP[entity]();
    return NextResponse.json({ ok: true, entity, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
