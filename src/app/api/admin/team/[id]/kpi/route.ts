/**
 * GET   /api/admin/team/[id]/kpi — KPI списку
 * POST  /api/admin/team/[id]/kpi — додати KPI (CEO only)
 * PATCH /api/admin/team/[id]/kpi — оновити KPI (CEO only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ────── GET ──────

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: memberId } = await context.params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("team_kpi")
      .select("*")
      .eq("member_id", memberId)
      .order("period", { ascending: false });

    if (error) {
      console.error("[KPI GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("[KPI GET]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// ────── POST (CEO only) ──────

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAdminUser();
    if (!user || user.role !== "ceo") {
      return NextResponse.json({ error: "Тільки CEO" }, { status: 403 });
    }

    const { id: memberId } = await context.params;
    const supabase = createAdminClient();
    const body = await request.json();

    if (!body.period || !body.metric) {
      return NextResponse.json({ error: "period та metric обов'язкові" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("team_kpi")
      .insert({
        member_id: memberId,
        period: body.period,
        metric: body.metric,
        target: body.target ?? null,
        actual: body.actual ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("[KPI POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[KPI POST]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

// ────── PATCH (CEO only) ──────

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAdminUser();
    if (!user || user.role !== "ceo") {
      return NextResponse.json({ error: "Тільки CEO" }, { status: 403 });
    }

    const { id: memberId } = await context.params;
    const supabase = createAdminClient();
    const body = await request.json();

    if (!body.kpi_id) {
      return NextResponse.json({ error: "kpi_id обов'язковий" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if ("target" in body) updates.target = body.target;
    if ("actual" in body) updates.actual = body.actual;
    if ("metric" in body) updates.metric = body.metric;

    const { data, error } = await supabase
      .from("team_kpi")
      .update(updates)
      .eq("id", body.kpi_id)
      .eq("member_id", memberId)
      .select()
      .single();

    if (error) {
      console.error("[KPI PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[KPI PATCH]", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
