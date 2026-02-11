/**
 * SmartЛійки — Funnel Tracking Engine
 *
 * Tracks contacts through funnel stages based on events.
 * Call trackFunnelEvent() from any place in the app to trigger transitions.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type FunnelEventType =
  | "page_visit"
  | "otp_sent"
  | "otp_verified"
  | "register"
  | "login"
  | "catalog_view"
  | "product_view"
  | "add_to_cart"
  | "order_placed"
  | "order_paid"
  | "order_delivered"
  | "loyalty_tier_change"
  | "cron_inactive_check"
  | "manual";

interface TrackEventData {
  event: FunnelEventType;
  phone?: string;
  profileId?: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track a funnel event — auto-moves contacts to appropriate stages.
 * This is fire-and-forget, errors are logged silently.
 */
export async function trackFunnelEvent(data: TrackEventData): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Find all active funnels
    const { data: funnels } = await supabase
      .from("funnels")
      .select("id")
      .eq("is_active", true);

    if (!funnels || funnels.length === 0) return;

    for (const funnel of funnels) {
      await processFunnelEvent(supabase, funnel.id, data);
    }
  } catch (err) {
    console.error("[Funnel Tracker] Error:", err);
  }
}

async function processFunnelEvent(
  supabase: ReturnType<typeof createAdminClient>,
  funnelId: string,
  data: TrackEventData,
): Promise<void> {
  // Get all stages for this funnel
  const { data: stages } = await supabase
    .from("funnel_stages")
    .select("id, slug, position, auto_triggers")
    .eq("funnel_id", funnelId)
    .order("position", { ascending: true });

  if (!stages || stages.length === 0) return;

  // Find which stage(s) this event triggers
  const triggeredStage = findTriggeredStage(stages, data);
  if (!triggeredStage) return;

  // Find or create contact in this funnel
  let contact = await findContact(supabase, funnelId, data);

  if (!contact) {
    // Only create new contact for early-stage events
    if (triggeredStage.position > 1 && !data.profileId) return;

    // Create contact at the triggered stage
    const { data: newContact, error } = await supabase
      .from("funnel_contacts")
      .insert({
        funnel_id: funnelId,
        stage_id: triggeredStage.id,
        profile_id: data.profileId || null,
        phone: data.phone || null,
        name: data.name || null,
        email: data.email || null,
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error || !newContact) return;

    // Log event
    await supabase.from("funnel_events").insert({
      funnel_id: funnelId,
      contact_id: newContact.id,
      from_stage_id: null,
      to_stage_id: triggeredStage.id,
      event_type: "trigger",
      event_trigger: data.event,
      metadata: data.metadata || {},
    });

    return;
  }

  // Contact exists — check if they should advance
  const currentStagePosition = stages.find(
    (s) => s.id === contact!.stage_id,
  )?.position;

  if (
    currentStagePosition === undefined ||
    triggeredStage.position <= currentStagePosition
  ) {
    // Already at or past this stage
    return;
  }

  const isLastStage =
    triggeredStage.position === stages[stages.length - 1].position;

  // Move contact to new stage
  await supabase
    .from("funnel_contacts")
    .update({
      stage_id: triggeredStage.id,
      entered_stage_at: new Date().toISOString(),
      ...(isLastStage ? { converted_at: new Date().toISOString() } : {}),
      // Update profile link if we now have it
      ...(data.profileId && !contact.profile_id
        ? { profile_id: data.profileId }
        : {}),
    })
    .eq("id", contact.id);

  // Log event
  await supabase.from("funnel_events").insert({
    funnel_id: funnelId,
    contact_id: contact.id,
    from_stage_id: contact.stage_id,
    to_stage_id: triggeredStage.id,
    event_type: "trigger",
    event_trigger: data.event,
    metadata: data.metadata || {},
  });
}

function findTriggeredStage(
  stages: {
    id: string;
    slug: string;
    position: number;
    auto_triggers: unknown;
  }[],
  data: TrackEventData,
): (typeof stages)[0] | null {
  // Find the highest-position stage that matches this event
  let matched: (typeof stages)[0] | null = null;

  for (const stage of stages) {
    const triggers = stage.auto_triggers as
      | { event: string; conditions?: Record<string, unknown> }[]
      | null;

    if (!triggers || !Array.isArray(triggers)) continue;

    for (const trigger of triggers) {
      if (trigger.event === data.event) {
        // Check conditions
        if (matchConditions(trigger.conditions, data.metadata)) {
          if (!matched || stage.position > matched.position) {
            matched = stage;
          }
        }
      }
    }
  }

  return matched;
}

function matchConditions(
  conditions: Record<string, unknown> | undefined,
  metadata: Record<string, unknown> | undefined,
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;
  if (!metadata) return false;

  for (const [key, value] of Object.entries(conditions)) {
    // Handle special condition operators
    if (key.endsWith("_gte")) {
      const field = key.replace("_gte", "");
      if (Number(metadata[field] || 0) < Number(value)) return false;
    } else if (key.endsWith("_lte")) {
      const field = key.replace("_lte", "");
      if (Number(metadata[field] || 0) > Number(value)) return false;
    } else {
      if (metadata[key] !== value) return false;
    }
  }
  return true;
}

async function findContact(
  supabase: ReturnType<typeof createAdminClient>,
  funnelId: string,
  data: TrackEventData,
): Promise<{
  id: string;
  stage_id: string;
  profile_id: string | null;
} | null> {
  // Search by profile_id first (most reliable)
  if (data.profileId) {
    const { data: contact } = await supabase
      .from("funnel_contacts")
      .select("id, stage_id, profile_id")
      .eq("funnel_id", funnelId)
      .eq("profile_id", data.profileId)
      .eq("is_active", true)
      .single();

    if (contact) return contact;
  }

  // Search by phone
  if (data.phone) {
    const { data: contact } = await supabase
      .from("funnel_contacts")
      .select("id, stage_id, profile_id")
      .eq("funnel_id", funnelId)
      .eq("phone", data.phone)
      .eq("is_active", true)
      .single();

    if (contact) return contact;
  }

  return null;
}
