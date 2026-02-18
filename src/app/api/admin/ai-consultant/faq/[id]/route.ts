import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/* PUT — update FAQ entry */
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const allowed = ["question", "answer", "keywords", "is_active", "sort_order", "category_id"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ai_faq_entries")
      .update(updates)
      .eq("id", id)
      .select("*, ai_faq_categories(slug, name, icon)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[API:FAQ] PUT error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

/* DELETE — delete FAQ entry */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const supabase = createAdminClient();

    const { error } = await supabase.from("ai_faq_entries").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API:FAQ] DELETE error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
