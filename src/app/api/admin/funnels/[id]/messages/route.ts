/**
 * API: Funnel Stage Messages — CRUD for message templates
 *
 * GET  /api/admin/funnels/[id]/messages — list all messages for a funnel
 * POST /api/admin/funnels/[id]/messages — create a new message template
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id: funnelId } = await params;

  const supabase = createAdminClient();

  const { data: messages, error } = await supabase
    .from("funnel_messages")
    .select(`
      *,
      funnel_stages (
        name,
        slug,
        position
      )
    `)
    .eq("funnel_id", funnelId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: messages || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id: funnelId } = await params;

  const body = await request.json();
  const { stage_id, name, channel, template, delay_minutes, sort_order } = body;

  if (!stage_id || !name || !template) {
    return NextResponse.json(
      { error: "stage_id, name, and template are required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: message, error } = await supabase
    .from("funnel_messages")
    .insert({
      funnel_id: funnelId,
      stage_id,
      name,
      channel: channel || "auto",
      template,
      delay_minutes: delay_minutes || 0,
      sort_order: sort_order || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: message }, { status: 201 });
}
