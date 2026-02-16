/**
 * API: AI Funnel Advisor
 *
 * POST /api/admin/funnels/ai — ask AI about funnels
 * POST /api/admin/funnels/ai?action=score — score contacts in a funnel
 * POST /api/admin/funnels/ai?action=generate — generate message template
 * POST /api/admin/funnels/ai?action=analyze — full funnel analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adviseFunnel,
  scoreFunnelContacts,
  generateTemplate,
  analyzeFunnels,
} from "@/lib/ai/funnel-ai";
import { isAIConfigured, type ClaudeMessage } from "@/lib/ai/claude";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  // Check if AI is configured
  const configured = await isAIConfigured();
  if (!configured) {
    return NextResponse.json(
      {
        error: "Claude AI не налаштовано",
        hint: "Додайте API ключ: Адмінка → Інтеграції → Claude API",
      },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "chat";

  try {
    const body = await request.json();

    switch (action) {
      case "chat": {
        // AI Advisor chat
        const { question, previousMessages, funnelId } = body;

        if (!question) {
          return NextResponse.json(
            { error: "question is required" },
            { status: 400 },
          );
        }

        // Optionally load funnel data for context
        let funnelData: string | undefined;
        if (funnelId) {
          funnelData = await getFunnelContext(funnelId);
        } else {
          funnelData = await getAllFunnelsContext();
        }

        const reply = await adviseFunnel(question, {
          funnelData,
          previousMessages: previousMessages as ClaudeMessage[] | undefined,
        });

        return NextResponse.json({ data: { reply } });
      }

      case "score": {
        // Score contacts in a funnel
        const { funnelId } = body;

        if (!funnelId) {
          return NextResponse.json(
            { error: "funnelId is required" },
            { status: 400 },
          );
        }

        const scores = await scoreFunnelContacts(funnelId);
        return NextResponse.json({ data: { scores } });
      }

      case "generate": {
        // Generate message template
        const { funnelName, stageName, stageDescription, channel, tone } = body;

        if (!funnelName || !stageName) {
          return NextResponse.json(
            { error: "funnelName and stageName are required" },
            { status: 400 },
          );
        }

        const template = await generateTemplate({
          funnelName,
          stageName,
          stageDescription,
          channel: channel || "telegram",
          tone,
        });

        return NextResponse.json({ data: { template } });
      }

      case "analyze": {
        // Full funnel analysis
        const analysis = await analyzeFunnels();
        return NextResponse.json({ data: { analysis } });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error("[FunnelAI API] Error:", err);
    return NextResponse.json(
      { error: "AI processing error" },
      { status: 500 },
    );
  }
}

// ────── Context Loaders ──────

async function getFunnelContext(funnelId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: funnel } = await supabase
    .from("funnels")
    .select("name, slug, description")
    .eq("id", funnelId)
    .single();

  const { data: stages } = await supabase
    .from("funnel_stages")
    .select("id, name, slug, position")
    .eq("funnel_id", funnelId)
    .order("position");

  const stageCounts: Record<string, number> = {};
  if (stages) {
    for (const stage of stages) {
      const { count } = await supabase
        .from("funnel_contacts")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", stage.id)
        .eq("is_active", true);
      stageCounts[stage.name] = count ?? 0;
    }
  }

  const { count: totalContacts } = await supabase
    .from("funnel_contacts")
    .select("id", { count: "exact", head: true })
    .eq("funnel_id", funnelId)
    .eq("is_active", true);

  const { count: convertedContacts } = await supabase
    .from("funnel_contacts")
    .select("id", { count: "exact", head: true })
    .eq("funnel_id", funnelId)
    .not("converted_at", "is", null);

  // Messages
  const { data: messages } = await supabase
    .from("funnel_messages")
    .select("name, channel, delay_minutes, is_active")
    .eq("funnel_id", funnelId);

  // Recent events
  const { data: events } = await supabase
    .from("funnel_events")
    .select("event_trigger, created_at")
    .eq("funnel_id", funnelId)
    .order("created_at", { ascending: false })
    .limit(20);

  return JSON.stringify(
    {
      funnel: funnel?.name,
      description: funnel?.description,
      stages: stages?.map((s) => ({
        name: s.name,
        position: s.position,
        contacts: stageCounts[s.name] || 0,
      })),
      totalContacts: totalContacts ?? 0,
      convertedContacts: convertedContacts ?? 0,
      conversionRate:
        (totalContacts ?? 0) > 0
          ? (((convertedContacts ?? 0) / (totalContacts ?? 0)) * 100).toFixed(1)
          : "0",
      messages: messages?.length || 0,
      activeMessages: messages?.filter((m) => m.is_active).length || 0,
      recentEvents: events?.slice(0, 10).map((e) => ({
        trigger: e.event_trigger,
        date: e.created_at,
      })),
    },
    null,
    2,
  );
}

async function getAllFunnelsContext(): Promise<string> {
  const supabase = createAdminClient();

  const { data: funnels } = await supabase
    .from("funnels")
    .select("id, name, slug, description, is_active")
    .eq("is_active", true);

  if (!funnels) return "Немає активних воронок";

  const summaries = [];

  for (const funnel of funnels) {
    const { data: stages } = await supabase
      .from("funnel_stages")
      .select("id, name, position")
      .eq("funnel_id", funnel.id)
      .order("position");

    const stageCounts: { name: string; count: number }[] = [];
    if (stages) {
      for (const stage of stages) {
        const { count } = await supabase
          .from("funnel_contacts")
          .select("id", { count: "exact", head: true })
          .eq("stage_id", stage.id)
          .eq("is_active", true);
        stageCounts.push({ name: stage.name, count: count ?? 0 });
      }
    }

    const { count: total } = await supabase
      .from("funnel_contacts")
      .select("id", { count: "exact", head: true })
      .eq("funnel_id", funnel.id)
      .eq("is_active", true);

    const { count: converted } = await supabase
      .from("funnel_contacts")
      .select("id", { count: "exact", head: true })
      .eq("funnel_id", funnel.id)
      .not("converted_at", "is", null);

    summaries.push({
      name: funnel.name,
      stages: stageCounts,
      total: total ?? 0,
      converted: converted ?? 0,
      rate:
        (total ?? 0) > 0
          ? `${(((converted ?? 0) / (total ?? 0)) * 100).toFixed(1)}%`
          : "0%",
    });
  }

  // Messaging stats
  const { count: totalMessages } = await supabase
    .from("message_log")
    .select("id", { count: "exact", head: true });

  const { count: telegramClients } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("telegram_chat_id", "is", null);

  const { count: totalClients } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return JSON.stringify(
    {
      funnels: summaries,
      messaging: {
        totalSent: totalMessages ?? 0,
        telegramClients: telegramClients ?? 0,
        totalClients: totalClients ?? 0,
      },
    },
    null,
    2,
  );
}
