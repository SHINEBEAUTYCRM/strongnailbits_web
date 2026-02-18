/**
 * Funnel Auto-Actions Engine
 *
 * Executes message templates when contacts move to new funnel stages.
 * Called from the funnel tracker after a stage transition.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  deliverMessage,
  resolveTarget,
  buildVariables,
  type TemplateVariables,
} from "./delivery";

interface StageTransition {
  funnelId: string;
  contactId: string;
  stageId: string;
  profileId?: string | null;
  phone?: string | null;
  contactName?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Execute all auto-actions for a funnel stage transition.
 * This processes message templates tied to the new stage.
 */
export async function executeStageActions(
  transition: StageTransition,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Get all active message templates for this stage
    const { data: messages } = await supabase
      .from("funnel_messages")
      .select("*")
      .eq("stage_id", transition.stageId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!messages || messages.length === 0) return;

    // Build delivery target and variables
    const target = await resolveTarget(
      transition.profileId || undefined,
      transition.phone || undefined,
    );

    const variables = await buildVariables(
      transition.profileId || undefined,
      transition.metadata,
    );

    // Fallback name from contact
    if (!variables.name && transition.contactName) {
      variables.name = transition.contactName;
    }
    if (!variables.name) {
      variables.name = "Клієнте";
    }

    for (const msg of messages) {
      if (msg.delay_minutes > 0) {
        // Schedule for later
        await scheduleMessage(supabase, {
          funnelMessageId: msg.id,
          funnelContactId: transition.contactId,
          profileId: transition.profileId || undefined,
          phone: transition.phone || undefined,
          variables,
          delayMinutes: msg.delay_minutes,
        });
      } else {
        // Send immediately
        await deliverMessage({
          target,
          template: msg.template,
          variables,
          channel: msg.channel || "auto",
          buttonsJson: msg.buttons_json || null,
          photoUrl: msg.photo_url || null,
          funnelContactId: transition.contactId,
          funnelMessageId: msg.id,
        });
      }
    }
  } catch (err) {
    console.error("[FunnelActions] Error executing stage actions:", err);
  }
}

/** Schedule a delayed message */
async function scheduleMessage(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    funnelMessageId: string;
    funnelContactId: string;
    profileId?: string;
    phone?: string;
    variables: TemplateVariables;
    delayMinutes: number;
  },
): Promise<void> {
  const scheduledFor = new Date(
    Date.now() + params.delayMinutes * 60 * 1000,
  ).toISOString();

  await supabase.from("scheduled_messages").insert({
    funnel_message_id: params.funnelMessageId,
    funnel_contact_id: params.funnelContactId,
    profile_id: params.profileId || null,
    phone: params.phone || null,
    variables: params.variables,
    scheduled_for: scheduledFor,
  });
}

/**
 * Process pending scheduled messages.
 * Called from the every-15min cron job.
 */
export async function processScheduledMessages(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const supabase = createAdminClient();
  const stats = { processed: 0, sent: 0, failed: 0 };

  try {
    // Get messages that are due
    const { data: pending } = await supabase
      .from("scheduled_messages")
      .select(`
        id,
        funnel_message_id,
        funnel_contact_id,
        profile_id,
        phone,
        variables,
        funnel_messages (
          template,
          channel,
          is_active,
          buttons_json,
          photo_url
        )
      `)
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(50);

    if (!pending || pending.length === 0) return stats;

    for (const item of pending) {
      stats.processed++;

      // Skip if message template was deactivated
      const msgTemplate = item.funnel_messages as unknown as {
        template: string;
        channel: string;
        is_active: boolean;
        buttons_json: string | null;
        photo_url: string | null;
      } | null;

      if (!msgTemplate?.is_active) {
        await supabase
          .from("scheduled_messages")
          .update({ status: "cancelled" })
          .eq("id", item.id);
        continue;
      }

      // Check if contact is still active in funnel
      const { data: contact } = await supabase
        .from("funnel_contacts")
        .select("is_active")
        .eq("id", item.funnel_contact_id)
        .single();

      if (!contact?.is_active) {
        await supabase
          .from("scheduled_messages")
          .update({ status: "cancelled" })
          .eq("id", item.id);
        continue;
      }

      try {
        const target = await resolveTarget(
          item.profile_id || undefined,
          item.phone || undefined,
        );

        const variables = (item.variables || {}) as Record<string, string>;

        const results = await deliverMessage({
          target,
          template: msgTemplate.template,
          variables,
          channel: (msgTemplate.channel as "auto" | "telegram" | "sms" | "both") || "auto",
          buttonsJson: msgTemplate.buttons_json || null,
          photoUrl: msgTemplate.photo_url || null,
          funnelContactId: item.funnel_contact_id,
          funnelMessageId: item.funnel_message_id,
        });

        const anySent = results.some((r) => r.success);

        await supabase
          .from("scheduled_messages")
          .update({
            status: anySent ? "sent" : "failed",
            sent_at: anySent ? new Date().toISOString() : null,
            error: anySent ? null : results.map((r) => r.error).join("; "),
          })
          .eq("id", item.id);

        if (anySent) stats.sent++;
        else stats.failed++;
      } catch (err) {
        await supabase
          .from("scheduled_messages")
          .update({
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error",
          })
          .eq("id", item.id);
        stats.failed++;
      }
    }
  } catch (err) {
    console.error("[ScheduledMessages] Processing error:", err);
  }

  return stats;
}
