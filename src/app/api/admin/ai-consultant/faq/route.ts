import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/* GET — all FAQ entries (with category join) */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    const supabase = createAdminClient();
    let query = supabase
      .from("ai_faq_entries")
      .select("*, ai_faq_categories(slug, name, icon)")
      .order("sort_order", { ascending: true });

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[API:FAQ] GET error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

/* POST — create FAQ entry */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    if (!body.question || !body.answer) {
      return NextResponse.json({ success: false, error: "question and answer required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ai_faq_entries")
      .insert({
        category_id: body.category_id || null,
        question: body.question,
        answer: body.answer,
        keywords: body.keywords || [],
        sort_order: body.sort_order ?? 0,
      })
      .select("*, ai_faq_categories(slug, name, icon)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[API:FAQ] POST error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
