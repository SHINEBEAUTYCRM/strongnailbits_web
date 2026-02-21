import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  GET — feature values for a product                                 */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const productId = request.nextUrl.searchParams.get("product_id");
  if (!productId) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const [{ data: features }, { data: pfRows }, { data: variants }] = await Promise.all([
    supabase
      .from("features")
      .select("id, name_uk, name_ru, feature_type, slug, is_filter, filter_position, status")
      .eq("status", "active")
      .order("filter_position", { ascending: true })
      .order("name_uk", { ascending: true }),
    supabase
      .from("product_features")
      .select("feature_id, variant_id, value_text")
      .eq("product_id", productId),
    supabase
      .from("feature_variants")
      .select("id, feature_id, name_uk, name_ru, color_code, position, metadata")
      .order("position", { ascending: true })
      .order("name_uk", { ascending: true }),
  ]);

  const pfMap = new Map<string, Array<{ variant_id: string | null; value_text: string | null }>>();
  for (const row of pfRows || []) {
    const arr = pfMap.get(row.feature_id) || [];
    arr.push({ variant_id: row.variant_id, value_text: row.value_text });
    pfMap.set(row.feature_id, arr);
  }

  const variantsByFeature = new Map<string, Array<Record<string, unknown>>>();
  for (const v of variants || []) {
    const arr = variantsByFeature.get(v.feature_id) || [];
    arr.push(v);
    variantsByFeature.set(v.feature_id, arr);
  }

  const values = (features || []).map((f) => {
    const pf = pfMap.get(f.id) || [];
    const hasVariants = ["S", "M", "E"].includes(f.feature_type);

    return {
      feature_id: f.id,
      feature_name_uk: f.name_uk,
      feature_name_ru: f.name_ru,
      feature_type: f.feature_type,
      variant_id: pf[0]?.variant_id || null,
      variant_ids: pf.filter((p) => p.variant_id).map((p) => p.variant_id),
      value_text: pf[0]?.value_text || null,
      variants: hasVariants ? (variantsByFeature.get(f.id) || []) : [],
    };
  });

  return NextResponse.json({ values });
}

/* ------------------------------------------------------------------ */
/*  PUT — save feature values for a product                            */
/* ------------------------------------------------------------------ */

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { product_id, values } = body;

  if (!product_id || !Array.isArray(values)) {
    return NextResponse.json({ error: "product_id and values[] required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: before } = await supabase
    .from("product_features")
    .select("feature_id, variant_id, value_text")
    .eq("product_id", product_id);

  await supabase.from("product_features").delete().eq("product_id", product_id);

  const rows: Array<Record<string, unknown>> = [];

  for (const v of values) {
    if (!v.feature_id) continue;

    if (Array.isArray(v.variant_ids) && v.variant_ids.length > 0) {
      for (const vid of v.variant_ids) {
        rows.push({
          product_id,
          feature_id: v.feature_id,
          variant_id: vid,
          value_text: null,
        });
      }
    } else if (v.variant_id) {
      rows.push({
        product_id,
        feature_id: v.feature_id,
        variant_id: v.variant_id,
        value_text: null,
      });
    } else if (v.value_text !== undefined && v.value_text !== null && v.value_text !== "") {
      rows.push({
        product_id,
        feature_id: v.feature_id,
        variant_id: null,
        value_text: String(v.value_text),
      });
    } else if (v.value_boolean === true) {
      rows.push({
        product_id,
        feature_id: v.feature_id,
        variant_id: null,
        value_text: "true",
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("product_features").insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await logAction({
    user: auth.user as Parameters<typeof logAction>[0]["user"],
    entity: "product_features",
    entity_id: product_id,
    action: "update",
    before: { count: before?.length || 0 },
    after: { count: rows.length },
    request,
  });

  return NextResponse.json({ ok: true, saved: rows.length });
}
