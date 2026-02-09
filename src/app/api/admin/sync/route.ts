import { NextRequest, NextResponse } from "next/server";
import { syncCategories } from "@/lib/sync/categories";
import { syncBrands } from "@/lib/sync/brands";
import { syncProducts, linkProductsBrands } from "@/lib/sync/products";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SYNC_MAP: Record<string, () => Promise<unknown>> = {
  categories: syncCategories,
  brands: syncBrands,
  products: syncProducts,
  "link-brands": linkProductsBrands,
};

export async function POST(request: NextRequest) {
  try {
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
