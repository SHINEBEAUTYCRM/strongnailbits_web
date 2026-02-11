/**
 * API: Single Funnel Message — update and delete
 *
 * PATCH  /api/admin/funnels/[id]/messages/[messageId]
 * DELETE /api/admin/funnels/[id]/messages/[messageId]
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { messageId } = await params;

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.channel !== undefined) updates.channel = body.channel;
  if (body.template !== undefined) updates.template = body.template;
  if (body.delay_minutes !== undefined)
    updates.delay_minutes = body.delay_minutes;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("funnel_messages")
    .update(updates)
    .eq("id", messageId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { messageId } = await params;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("funnel_messages")
    .delete()
    .eq("id", messageId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
