/**
 * GET /api/admin/team/[id]/activity — активність співробітника
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: memberId } = await context.params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("task_activity")
      .select("*")
      .eq("actor_id", memberId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[Team Activity GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[Team Activity GET]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
