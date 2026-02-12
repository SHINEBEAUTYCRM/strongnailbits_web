// POST /api/banners/:id/analytics — track view/click (public, no auth)
// GET  /api/banners/:id/analytics — get analytics (admin only)
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action as string;

    if (action !== "view" && action !== "click") {
      return NextResponse.json(
        { error: 'Invalid action. Expected "view" or "click".' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const rpcName = action === "view"
      ? "increment_banner_views"
      : "increment_banner_clicks";

    const { error } = await supabase.rpc(rpcName, { banner_id: id });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("banners")
    .select("id, title, views_count, clicks_count")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const ctr = data.views_count > 0
    ? Math.round((data.clicks_count / data.views_count) * 10000) / 100
    : 0;

  return NextResponse.json({
    id: data.id,
    title: data.title,
    views_count: data.views_count,
    clicks_count: data.clicks_count,
    ctr,
  });
}
