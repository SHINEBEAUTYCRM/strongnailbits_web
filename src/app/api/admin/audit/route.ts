import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  if (!["admin", "owner"].includes(auth.user.role)) {
    return NextResponse.json({ error: "Forbidden: admin/owner only" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const entity = sp.get("entity");
  const entityId = sp.get("entity_id");
  const actorId = sp.get("actor_id");
  const action = sp.get("action");
  const from = sp.get("from");
  const to = sp.get("to");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (entity) query = query.eq("entity", entity);
  if (entityId) query = query.eq("entity_id", entityId);
  if (actorId) query = query.eq("actor_id", actorId);
  if (action) query = query.eq("action", action);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: data ?? [], total: count ?? 0 });
}
