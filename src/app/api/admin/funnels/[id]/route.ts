import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** GET /api/admin/funnels/[id] — Get funnel with full details */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  // Funnel
  const { data: funnel, error } = await supabase
    .from("funnels")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !funnel) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
  }

  // Stages with contact counts
  const { data: stages } = await supabase
    .from("funnel_stages")
    .select("*")
    .eq("funnel_id", id)
    .order("position", { ascending: true });

  const stagesWithCounts = await Promise.all(
    (stages || []).map(async (stage) => {
      const { count } = await supabase
        .from("funnel_contacts")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", stage.id)
        .eq("is_active", true);

      // Recent contacts on this stage
      const { data: contacts } = await supabase
        .from("funnel_contacts")
        .select("id, name, phone, email, entered_stage_at, metadata")
        .eq("stage_id", stage.id)
        .eq("is_active", true)
        .order("entered_stage_at", { ascending: false })
        .limit(10);

      return {
        ...stage,
        contactCount: count ?? 0,
        recentContacts: contacts || [],
      };
    }),
  );

  // Messages per stage
  const { data: messages } = await supabase
    .from("funnel_messages")
    .select("*")
    .eq("funnel_id", id)
    .order("sort_order", { ascending: true });

  // Recent events
  const { data: events } = await supabase
    .from("funnel_events")
    .select("*, from_stage:from_stage_id(name), to_stage:to_stage_id(name)")
    .eq("funnel_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Conversion stats (last 30 days)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { count: newContactsMonth } = await supabase
    .from("funnel_contacts")
    .select("id", { count: "exact", head: true })
    .eq("funnel_id", id)
    .gte("entered_funnel_at", thirtyDaysAgo);

  const { count: convertedMonth } = await supabase
    .from("funnel_contacts")
    .select("id", { count: "exact", head: true })
    .eq("funnel_id", id)
    .not("converted_at", "is", null)
    .gte("converted_at", thirtyDaysAgo);

  return NextResponse.json({
    data: {
      ...funnel,
      stages: stagesWithCounts,
      messages: messages || [],
      recentEvents: events || [],
      stats: {
        newContactsMonth: newContactsMonth ?? 0,
        convertedMonth: convertedMonth ?? 0,
        conversionRate30d:
          (newContactsMonth ?? 0) > 0
            ? (((convertedMonth ?? 0) / (newContactsMonth ?? 0)) * 100).toFixed(1)
            : "0.0",
      },
    },
  });
}

/** DELETE /api/admin/funnels/[id] — Delete a funnel */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  // Check if default
  const { data: funnel } = await supabase
    .from("funnels")
    .select("is_default")
    .eq("id", id)
    .single();

  if (funnel?.is_default) {
    return NextResponse.json(
      { error: "Cannot delete default funnel" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("funnels").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
