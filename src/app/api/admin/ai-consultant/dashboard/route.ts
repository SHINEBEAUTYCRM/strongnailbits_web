import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

/* GET — aggregated dashboard data */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const supabase = createAdminClient();
    const today = todayStr();
    const weekAgo = daysAgoStr(7);
    const monthAgo = daysAgoStr(30);

    /* ── Parallel queries ────────────────────────── */
    const [
      todaySessions,
      weekSessions,
      dailyChart,
      popularFaq,
      managersActive,
      managersOnline,
      budgetToday,
      budgetMonth,
      configRow,
    ] = await Promise.all([
      /* Today sessions */
      supabase
        .from("ai_chat_sessions")
        .select("id, manager_id, satisfaction_rating, message_count")
        .gte("created_at", today + "T00:00:00")
        .lte("created_at", today + "T23:59:59.999Z"),

      /* Week sessions */
      supabase
        .from("ai_chat_sessions")
        .select("id, manager_id, satisfaction_rating, message_count, detected_intents")
        .gte("created_at", weekAgo + "T00:00:00"),

      /* Daily chart (budget_daily last 7 days) */
      supabase
        .from("ai_budget_daily")
        .select("date, total_sessions, cost_usd, total_escalations, haiku_calls, haiku_cost_usd, sonnet_calls, sonnet_cost_usd")
        .gte("date", weekAgo)
        .order("date", { ascending: true }),

      /* Popular FAQ */
      supabase
        .from("ai_faq_entries")
        .select("question, times_used")
        .gt("times_used", 0)
        .order("times_used", { ascending: false })
        .limit(5),

      /* Managers active */
      supabase
        .from("ai_chat_managers")
        .select("id", { count: "exact" })
        .eq("is_active", true),

      /* Managers online */
      supabase
        .from("ai_chat_managers")
        .select("id", { count: "exact" })
        .eq("is_active", true)
        .eq("is_online", true),

      /* Budget today */
      supabase
        .from("ai_budget_daily")
        .select("cost_usd")
        .eq("date", today)
        .limit(1)
        .maybeSingle(),

      /* Budget month sum */
      supabase
        .from("ai_budget_daily")
        .select("cost_usd")
        .gte("date", monthAgo),

      /* Config limits */
      supabase
        .from("ai_consultant_config")
        .select("daily_budget_usd, monthly_budget_usd, is_enabled")
        .limit(1)
        .single(),
    ]);

    /* ── Aggregate today ─────────────────────────── */
    const tRows = todaySessions.data || [];
    const tSessions = tRows.length;
    const tMessages = tRows.reduce((s, r) => s + (r.message_count || 0), 0);
    const tEscalations = tRows.filter((r) => r.manager_id).length;
    const tRatings = tRows.filter((r) => r.satisfaction_rating !== null).map((r) => r.satisfaction_rating as number);
    const tAvgRating = tRatings.length > 0 ? tRatings.reduce((a, b) => a + b, 0) / tRatings.length : null;
    const tCost = budgetToday.data?.cost_usd || 0;

    /* ── Aggregate week ──────────────────────────── */
    const wRows = weekSessions.data || [];
    const wSessions = wRows.length;
    const wMessages = wRows.reduce((s, r) => s + (r.message_count || 0), 0);
    const wEscalations = wRows.filter((r) => r.manager_id).length;
    const wRatings = wRows.filter((r) => r.satisfaction_rating !== null).map((r) => r.satisfaction_rating as number);
    const wAvgRating = wRatings.length > 0 ? wRatings.reduce((a, b) => a + b, 0) / wRatings.length : null;
    const chartRows = dailyChart.data || [];
    const wCost = chartRows.reduce((s, r) => s + (r.cost_usd || 0), 0);

    /* ── Popular intents ─────────────────────────── */
    const intentCounts: Record<string, number> = {};
    for (const r of wRows) {
      const intents = r.detected_intents as string[] | null;
      if (intents && Array.isArray(intents)) {
        for (const i of intents) {
          intentCounts[i] = (intentCounts[i] || 0) + 1;
        }
      }
    }
    const popularIntents = Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([intent, count]) => ({ intent, count }));

    /* ── Model usage (week) ──────────────────────── */
    const modelUsage = {
      haiku_calls: chartRows.reduce((s, r) => s + (r.haiku_calls || 0), 0),
      haiku_cost_usd: chartRows.reduce((s, r) => s + (r.haiku_cost_usd || 0), 0),
      sonnet_calls: chartRows.reduce((s, r) => s + (r.sonnet_calls || 0), 0),
      sonnet_cost_usd: chartRows.reduce((s, r) => s + (r.sonnet_cost_usd || 0), 0),
    };

    /* ── Budget ──────────────────────────────────── */
    const monthRows = budgetMonth.data || [];
    const monthUsd = monthRows.reduce((s, r) => s + (r.cost_usd || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        today: { sessions: tSessions, messages: tMessages, escalations: tEscalations, avg_rating: tAvgRating, cost_usd: tCost },
        week: { sessions: wSessions, messages: wMessages, escalations: wEscalations, avg_rating: wAvgRating, cost_usd: wCost },
        daily_chart: chartRows.map((r) => ({
          date: r.date,
          sessions: r.total_sessions || 0,
          cost_usd: r.cost_usd || 0,
          escalations: r.total_escalations || 0,
        })),
        popular_intents: popularIntents,
        popular_faq: (popularFaq.data || []).map((r) => ({ question: r.question, times_used: r.times_used })),
        managers_online: managersOnline.count || 0,
        managers_total: managersActive.count || 0,
        budget: {
          today_usd: tCost,
          daily_limit_usd: configRow.data?.daily_budget_usd ?? 50,
          month_usd: monthUsd,
          monthly_limit_usd: configRow.data?.monthly_budget_usd ?? 1000,
        },
        model_usage: modelUsage,
        is_enabled: configRow.data?.is_enabled ?? true,
      },
    });
  } catch (err) {
    console.error("[API:Dashboard] GET error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
