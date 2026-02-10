// ================================================================
//  API: /api/analytics/event
//  Зберігає аналітичні події в Supabase для реалтайм дашборду
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip + "shineshop-salt").digest("hex").slice(0, 16);
}

function getDeviceType(ua: string): string {
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      event_type,
      page_path,
      page_title,
      referrer,
      product_id,
      product_name,
      search_query,
      order_id,
      revenue,
      session_id,
      metadata,
    } = body;

    if (!event_type) {
      return NextResponse.json({ error: "event_type required" }, { status: 400 });
    }

    const clientIP =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "";
    const country = request.headers.get("x-vercel-ip-country") || null;

    const supabase = createAdminClient();

    await supabase.from("site_events").insert({
      event_type,
      page_path: page_path || null,
      page_title: page_title || null,
      referrer: referrer || null,
      product_id: product_id || null,
      product_name: product_name || null,
      search_query: search_query || null,
      order_id: order_id || null,
      revenue: revenue || null,
      session_id: session_id || null,
      user_agent: userAgent,
      ip_hash: hashIP(clientIP),
      country,
      device_type: getDeviceType(userAgent),
      metadata: metadata || {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
