import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "./auth";

export async function logAction(params: {
  user: AdminUser;
  entity: string;
  entity_id?: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  request?: Request;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("audit_log").insert({
      actor_id: params.user.id,
      actor_name: params.user.name,
      entity: params.entity,
      entity_id: params.entity_id ?? null,
      action: params.action,
      before_data: params.before ?? null,
      after_data: params.after ?? null,
      ip_address: params.request?.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      user_agent: params.request?.headers.get("user-agent") ?? null,
    });
  } catch (err) {
    console.error("[audit] Failed to log:", err);
  }
}
