import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("status", "active");

  if (!categories || categories.length === 0) {
    return NextResponse.json({ categories_processed: 0, bindings_created: 0 });
  }

  let categoriesProcessed = 0;
  let bindingsCreated = 0;

  for (const cat of categories) {
    const { data: featureIds } = await supabase
      .from("product_features")
      .select("feature_id, products!inner(category_id)")
      .eq("products.category_id", cat.id);

    if (!featureIds || featureIds.length === 0) continue;

    const uniqueIds = [...new Set(featureIds.map((r) => r.feature_id))];

    const rows = uniqueIds.map((fid, i) => ({
      category_id: cat.id,
      feature_id: fid,
      is_required: false,
      position: i,
    }));

    const { error } = await supabase
      .from("category_features")
      .upsert(rows, { onConflict: "category_id,feature_id", ignoreDuplicates: true });

    if (!error) {
      bindingsCreated += rows.length;
    }

    categoriesProcessed++;
  }

  return NextResponse.json({ categories_processed: categoriesProcessed, bindings_created: bindingsCreated });
}
