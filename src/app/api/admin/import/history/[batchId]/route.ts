import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/import/history/[batchId]
 * Get details of a specific import batch (including errors, excluding snapshot).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { batchId } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("import_batches")
    .select("id, type, status, filename, total_rows, created_count, updated_count, skipped_count, error_count, errors, created_at, completed_at, rolled_back_at")
    .eq("id", batchId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Batch не знайдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, batch: data });
}
