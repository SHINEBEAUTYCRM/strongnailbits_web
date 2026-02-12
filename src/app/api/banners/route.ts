// GET  /api/banners — list banners (with filters)
// POST /api/banners — create banner
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const isActive = searchParams.get("is_active");
  const placement = searchParams.get("placement");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = createAdminClient();

  let query = supabase
    .from("banners")
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true })
    .order("priority", { ascending: false });

  if (type) query = query.eq("type", type);
  if (isActive === "true") query = query.eq("is_active", true);
  if (isActive === "false") query = query.eq("is_active", false);
  if (placement) query = query.contains("placement", [placement]);

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ banners: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("banners")
      .insert({ ...body, created_by: auth.user.id })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, banner: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
