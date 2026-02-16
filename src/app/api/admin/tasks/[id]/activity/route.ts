/**
 * GET /api/admin/tasks/[id]/activity — лог активності
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("task_activity")
      .select(`
        *,
        actor:team_members!task_activity_actor_id_fkey(id, name, avatar_url)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Activity GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[Activity GET]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
