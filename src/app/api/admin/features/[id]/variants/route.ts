import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("feature_variants")
    .select("*")
    .eq("feature_id", id)
    .order("position", { ascending: true })
    .order("value_uk", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map value_uk/value_ru → name_uk/name_ru for UI compatibility
  const mapped = (data || []).map((v) => ({
    ...v,
    name_uk: v.value_uk ?? null,
    name_ru: v.value_ru ?? null,
  }));
  return NextResponse.json(mapped);
}
