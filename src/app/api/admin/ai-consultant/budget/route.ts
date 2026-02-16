import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/* GET — budget analytics with period filtering */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "month";
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    const supabase = createAdminClient();

    /* Build date filter */
    let query = supabase.from("ai_budget_daily").select("*");

    if (dateFrom && dateTo) {
      query = query.gte("date", dateFrom).lte("date", dateTo);
    } else {
      const now = new Date();
      const fmt = (d: Date) => d.toISOString().split("T")[0];

      switch (period) {
        case "today":
          query = query.eq("date", fmt(now));
          break;
        case "week": {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          query = query.gte("date", fmt(weekAgo));
          break;
        }
        case "month": {
          const monthAgo = new Date(now);
          monthAgo.setDate(monthAgo.getDate() - 30);
          query = query.gte("date", fmt(monthAgo));
          break;
        }
        case "all":
          break;
      }
    }

    query = query.order("date", { ascending: false });
    const { data: days, error: daysError } = await query;

    if (daysError) {
      return NextResponse.json({ success: false, error: daysError.message }, { status: 500 });
    }

    /* Compute totals */
    const rows = days || [];
    const totals = {
      total_sessions: 0,
      total_messages: 0,
      total_escalations: 0,
      cost_usd: 0,
      haiku_calls: 0,
      haiku_cost_usd: 0,
      sonnet_calls: 0,
      sonnet_cost_usd: 0,
    };

    for (const r of rows) {
      totals.total_sessions += r.total_sessions || 0;
      totals.total_messages += r.total_messages || 0;
      totals.total_escalations += r.total_escalations || 0;
      totals.cost_usd += r.cost_usd || 0;
      totals.haiku_calls += r.haiku_calls || 0;
      totals.haiku_cost_usd += r.haiku_cost_usd || 0;
      totals.sonnet_calls += r.sonnet_calls || 0;
      totals.sonnet_cost_usd += r.sonnet_cost_usd || 0;
    }

    /* Read budget limits from config */
    const { data: config } = await supabase
      .from("ai_consultant_config")
      .select("daily_budget_usd, monthly_budget_usd, budget_action")
      .limit(1)
      .single();

    const limits = {
      daily_budget_usd: config?.daily_budget_usd ?? 50,
      monthly_budget_usd: config?.monthly_budget_usd ?? 1000,
      budget_action: config?.budget_action ?? "haiku_only",
    };

    return NextResponse.json({
      success: true,
      data: { days: rows, totals, limits },
    });
  } catch (err) {
    console.error("[API:Budget] GET error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
