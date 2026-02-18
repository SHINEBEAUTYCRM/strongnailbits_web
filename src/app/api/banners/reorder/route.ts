// PATCH /api/banners/reorder — reorder banners by type
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { type, orderedIds } = body as { type: string; orderedIds: string[] };

    if (!type || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "type and orderedIds[] are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Update sort_order for each banner based on its index
    const updates = orderedIds.map((id, index) =>
      supabase
        .from("banners")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("type", type),
    );

    const results = await Promise.all(updates);

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API:Banners] Reorder failed:', err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
