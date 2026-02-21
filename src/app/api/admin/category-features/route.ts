import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getAdminUser } from "@/lib/admin/auth";
import { logAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  GET — features bound to a category                                 */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const categoryId = request.nextUrl.searchParams.get("category_id");
  if (!categoryId) {
    return NextResponse.json({ error: "category_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const [{ data: bindings }, { data: allFeatures }] = await Promise.all([
    supabase
      .from("category_features")
      .select("id, feature_id, is_required, position")
      .eq("category_id", categoryId)
      .order("position", { ascending: true }),
    supabase
      .from("features")
      .select("id, name_uk, name_ru, feature_type, is_filter, status")
      .eq("status", "active")
      .order("name_uk", { ascending: true }),
  ]);

  const boundIds = new Set((bindings || []).map((b) => b.feature_id));

  const variantCounts = new Map<string, number>();
  const featureIds = (allFeatures || []).map((f) => f.id);
  if (featureIds.length > 0) {
    const { data: vc } = await supabase
      .from("feature_variants")
      .select("feature_id")
      .in("feature_id", featureIds);
    for (const r of vc || []) {
      variantCounts.set(r.feature_id, (variantCounts.get(r.feature_id) || 0) + 1);
    }
  }

  const featureMap = new Map((allFeatures || []).map((f) => [f.id, f]));

  const features = (bindings || []).map((b) => {
    const f = featureMap.get(b.feature_id);
    return {
      id: b.id,
      feature_id: b.feature_id,
      feature_name_uk: f?.name_uk || "—",
      feature_name_ru: f?.name_ru || null,
      feature_type: f?.feature_type || "T",
      is_required: b.is_required,
      position: b.position,
      variants_count: variantCounts.get(b.feature_id) || 0,
    };
  });

  const available = (allFeatures || [])
    .filter((f) => !boundIds.has(f.id))
    .map((f) => ({
      id: f.id,
      name_uk: f.name_uk,
      feature_type: f.feature_type,
      is_filter: f.is_filter,
    }));

  return NextResponse.json({ features, available });
}

/* ------------------------------------------------------------------ */
/*  PUT — replace all bindings for a category                          */
/* ------------------------------------------------------------------ */

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { category_id, features } = body;

  if (!category_id || !Array.isArray(features)) {
    return NextResponse.json({ error: "category_id and features[] required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  await supabase.from("category_features").delete().eq("category_id", category_id);

  if (features.length > 0) {
    const rows = features.map((f: Record<string, unknown>, i: number) => ({
      category_id,
      feature_id: f.feature_id,
      is_required: f.is_required ?? false,
      position: f.position ?? i,
    }));

    const { error } = await supabase.from("category_features").insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const adminUser = await getAdminUser();
  if (adminUser) {
    await logAction({
      user: adminUser,
      entity: "category_features",
      entity_id: category_id,
      action: "update",
      after: { count: features.length },
      request,
    });
  }

  return NextResponse.json({ ok: true, saved: features.length });
}

/* ------------------------------------------------------------------ */
/*  POST — quick-add a single binding                                  */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { category_id, feature_id } = await request.json();
  if (!category_id || !feature_id) {
    return NextResponse.json({ error: "category_id and feature_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: maxPos } = await supabase
    .from("category_features")
    .select("position")
    .eq("category_id", category_id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPos = (maxPos?.position ?? -1) + 1;

  const { error } = await supabase.from("category_features").insert({
    category_id,
    feature_id,
    is_required: false,
    position: nextPos,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already bound" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
