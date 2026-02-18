import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface MatchItem {
  sku: string;
  cs_cart_id: number | null;
  name_uk: string;
}

interface MatchResult {
  sku: string;
  cs_cart_id: number | null;
  file_name: string;
  db_id: string | null;
  db_name: string | null;
  db_sku: string | null;
  db_description_uk_exists: boolean;
  db_description_ru_exists: boolean;
  db_images_exist: boolean;
  status: "matched" | "not_found";
}

/**
 * POST /api/admin/import/match-products
 * Match file products against DB by cs_cart_id, then by sku.
 * Max 500 items per request.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const items = body.items as MatchItem[];

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Batch fetch by cs_cart_id
    const csCartIds = items.map((i) => i.cs_cart_id).filter((id): id is number => id !== null && id > 0);
    let byIdMap = new Map<number, Record<string, unknown>>();

    if (csCartIds.length > 0) {
      const { data: byId } = await supabase
        .from("products")
        .select("id, sku, cs_cart_id, name_uk, description_uk, description_ru, main_image_url, slug")
        .in("cs_cart_id", csCartIds);

      if (byId) {
        for (const p of byId) {
          if (p.cs_cart_id) byIdMap.set(p.cs_cart_id as number, p);
        }
      }
    }

    // 2. Find unmatched and fetch by SKU
    const unmatchedSkus = items
      .filter((item) => !item.cs_cart_id || !byIdMap.has(item.cs_cart_id))
      .map((item) => item.sku)
      .filter(Boolean);

    let bySkuMap = new Map<string, Record<string, unknown>>();

    if (unmatchedSkus.length > 0) {
      const { data: bySku } = await supabase
        .from("products")
        .select("id, sku, cs_cart_id, name_uk, description_uk, description_ru, main_image_url, slug")
        .in("sku", unmatchedSkus);

      if (bySku) {
        for (const p of bySku) {
          if (p.sku) bySkuMap.set(String(p.sku), p);
        }
      }
    }

    // 3. Build results
    const matches: MatchResult[] = [];
    let matchedCount = 0;
    let notFoundCount = 0;

    for (const item of items) {
      let found: Record<string, unknown> | undefined;

      if (item.cs_cart_id && byIdMap.has(item.cs_cart_id)) {
        found = byIdMap.get(item.cs_cart_id);
      }
      if (!found && item.sku) {
        found = bySkuMap.get(item.sku);
      }

      if (found) {
        matchedCount++;
        matches.push({
          sku: item.sku,
          cs_cart_id: item.cs_cart_id,
          file_name: item.name_uk,
          db_id: String(found.id),
          db_name: found.name_uk ? String(found.name_uk) : null,
          db_sku: found.sku ? String(found.sku) : null,
          db_description_uk_exists: !!(found.description_uk && String(found.description_uk).length > 10),
          db_description_ru_exists: !!(found.description_ru && String(found.description_ru).length > 10),
          db_images_exist: !!found.main_image_url,
          status: "matched",
        });
      } else {
        notFoundCount++;
        matches.push({
          sku: item.sku,
          cs_cart_id: item.cs_cart_id,
          file_name: item.name_uk,
          db_id: null,
          db_name: null,
          db_sku: null,
          db_description_uk_exists: false,
          db_description_ru_exists: false,
          db_images_exist: false,
          status: "not_found",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      matches,
      stats: {
        total: items.length,
        matched: matchedCount,
        not_found: notFoundCount,
      },
    });
  } catch (err) {
    console.error("[match-products]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Match failed" },
      { status: 500 },
    );
  }
}
