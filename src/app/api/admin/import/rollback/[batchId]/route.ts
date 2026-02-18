import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface SnapshotItem {
  id: string;
  action: "created" | "updated";
  previous_data?: Record<string, unknown>;
}

/**
 * POST /api/admin/import/rollback/[batchId]
 * Roll back a completed import: delete created products, restore updated ones.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { batchId } = await params;
  const supabase = createAdminClient();

  // Fetch batch
  const { data: batch, error: fetchErr } = await supabase
    .from("import_batches")
    .select("id, status, snapshot, created_at, rolled_back_at")
    .eq("id", batchId)
    .single();

  if (fetchErr || !batch) {
    return NextResponse.json({ error: "Batch не знайдено" }, { status: 404 });
  }

  // Validate batch can be rolled back
  if (batch.status !== "completed") {
    return NextResponse.json(
      { error: `Неможливо відкатити: статус "${batch.status}" (потрібен "completed")` },
      { status: 400 },
    );
  }

  if (batch.rolled_back_at) {
    return NextResponse.json({ error: "Цей імпорт вже було відкачено" }, { status: 400 });
  }

  // Check 24h window
  const createdAt = new Date(batch.created_at).getTime();
  const now = Date.now();
  const hoursSinceImport = (now - createdAt) / (1000 * 60 * 60);
  if (hoursSinceImport > 24) {
    return NextResponse.json(
      { error: `Відкат можливий лише протягом 24 годин. Пройшло ${Math.round(hoursSinceImport)} год.` },
      { status: 400 },
    );
  }

  // Validate snapshot
  const snapshot = batch.snapshot as { items?: SnapshotItem[] } | null;
  if (!snapshot?.items || snapshot.items.length === 0) {
    return NextResponse.json({ error: "Snapshot порожній — відкат неможливий" }, { status: 400 });
  }

  // Execute rollback
  let deleted = 0;
  let restored = 0;
  const errors: string[] = [];

  for (const item of snapshot.items) {
    if (item.action === "created") {
      // DELETE product that was created during import
      const { error } = await supabase.from("products").delete().eq("id", item.id);
      if (error) {
        errors.push(`DELETE ${item.id}: ${error.message}`);
      } else {
        deleted++;
      }
    } else if (item.action === "updated" && item.previous_data) {
      // RESTORE product to previous state
      const { error } = await supabase.from("products").update(item.previous_data).eq("id", item.id);
      if (error) {
        errors.push(`RESTORE ${item.id}: ${error.message}`);
      } else {
        restored++;
      }
    }
  }

  // Update batch status
  await supabase.from("import_batches").update({
    status: "rolled_back",
    rolled_back_at: new Date().toISOString(),
  }).eq("id", batchId);

  return NextResponse.json({
    success: true,
    rolled_back: { deleted, restored },
    errors: errors.length > 0 ? errors : undefined,
  });
}
