// ================================================================
//  API: /api/analytics/event
//  Зберігає аналітичні події в Supabase для реалтайм дашборду
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { rateLimit, getIP, tooManyRequests } from "@/lib/api/rate-limit";

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'shineshop-default-salt';
  return crypto.createHash("sha256").update(ip + salt).digest("hex").slice(0, 16);
}

function getDeviceType(ua: string): string {
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export async function POST(request: NextRequest) {
  try {
    const { allowed } = rateLimit(`event:${getIP(request)}`, 100, 60);
    if (!allowed) return tooManyRequests();

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

    // Білий список event types
    const VALID_EVENTS = new Set([
      'page_view', 'product_view', 'add_to_cart', 'remove_from_cart',
      'checkout_start', 'purchase', 'search', 'category_view',
      'brand_view', 'wishlist_add', 'wishlist_remove', 'click',
      'scroll', 'session_start', 'filter_apply', 'banner_click',
      'promo_view', 'promo_click', 'deal_view', 'deal_click',
      'collection_view', 'add_to_cart_from_home',
    ]);

    if (!event_type || typeof event_type !== 'string' || !VALID_EVENTS.has(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }

    // Ліміт розміру payload
    if (JSON.stringify(body).length > 10240) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
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
  } catch (err) {
    console.error('[API:Analytics:Event] Event track failed:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
