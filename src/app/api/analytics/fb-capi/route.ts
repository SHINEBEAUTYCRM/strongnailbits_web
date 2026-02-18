// ================================================================
//  Facebook Conversions API (Server-Side)
//  Отправляет события на сервер FB без зависимости от браузера
//  POST /api/analytics/fb-capi
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceConfig } from "@/lib/integrations/config-resolver";

const FB_API_VERSION = "v21.0";

interface CAPIEvent {
  event_name: string;
  event_time?: number;
  action_source?: string;
  event_source_url?: string;
  user_data?: {
    em?: string;       // email (будет захеширован)
    ph?: string;       // phone (будет захеширован)
    fn?: string;       // first name
    ln?: string;       // last name
    ct?: string;       // city
    country?: string;  // country code
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;      // FB click ID cookie
    fbp?: string;      // FB browser ID cookie
  };
  custom_data?: {
    content_ids?: string[];
    content_type?: string;
    content_name?: string;
    value?: number;
    currency?: string;
    num_items?: number;
    search_string?: string;
    order_id?: string;
  };
}

function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizeUserData(userData: CAPIEvent["user_data"]) {
  if (!userData) return {};

  const normalized: Record<string, unknown> = {};

  if (userData.em) normalized.em = [hashSHA256(userData.em)];
  if (userData.ph) normalized.ph = [hashSHA256(userData.ph.replace(/\D/g, ""))];
  if (userData.fn) normalized.fn = [hashSHA256(userData.fn)];
  if (userData.ln) normalized.ln = [hashSHA256(userData.ln)];
  if (userData.ct) normalized.ct = [hashSHA256(userData.ct)];
  if (userData.country) normalized.country_code = [hashSHA256(userData.country)];
  if (userData.client_ip_address) normalized.client_ip_address = userData.client_ip_address;
  if (userData.client_user_agent) normalized.client_user_agent = userData.client_user_agent;
  if (userData.fbc) normalized.fbc = userData.fbc;
  if (userData.fbp) normalized.fbp = userData.fbp;

  return normalized;
}

export async function POST(request: NextRequest) {
  const fbConfig = await getServiceConfig('facebook-pixel');
  const FB_PIXEL_ID = fbConfig?.pixel_id;
  const FB_ACCESS_TOKEN = fbConfig?.access_token;

  if (!FB_PIXEL_ID || !FB_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "FB CAPI not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const events: CAPIEvent[] = Array.isArray(body.events) ? body.events : [body];

    // Enrich with server-side data
    const clientIP =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "0.0.0.0";
    const userAgent = request.headers.get("user-agent") || "";

    const fbEvents = events.map((event) => ({
      event_name: event.event_name,
      event_time: event.event_time || Math.floor(Date.now() / 1000),
      action_source: event.action_source || "website",
      event_source_url: event.event_source_url,
      user_data: {
        ...normalizeUserData(event.user_data),
        client_ip_address:
          event.user_data?.client_ip_address || clientIP,
        client_user_agent:
          event.user_data?.client_user_agent || userAgent,
      },
      custom_data: event.custom_data || {},
    }));

    const url = `https://graph.facebook.com/${FB_API_VERSION}/${FB_PIXEL_ID}/events`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: fbEvents,
        access_token: FB_ACCESS_TOKEN,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[FB CAPI] Error:", result);
      return NextResponse.json(
        { error: "FB CAPI request failed", details: result },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      events_received: result.events_received,
    });
  } catch (error) {
    console.error("[FB CAPI] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
