import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/import/start-batch
 * Creates an import_batches record and returns its ID.
 * Body: { filename, totalRows, type }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { filename, totalRows, type } = body;

    const supabase = createAdminClient();

    const { data: batch, error: batchErr } = await supabase
      .from("import_batches")
      .insert({
        type: type ?? "products",
        status: "processing",
        filename: filename ?? null,
        total_rows: totalRows ?? 0,
        created_count: 0,
        updated_count: 0,
        skipped_count: 0,
        error_count: 0,
        snapshot: null,
        errors: null,
      })
      .select("id")
      .single();

    if (batchErr || !batch) {
      console.error("[start-batch] Failed:", batchErr);
      return NextResponse.json({ error: "Не вдалося створити запис" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, batchId: batch.id });
  } catch (err) {
    console.error("[start-batch]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
