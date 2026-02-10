// ================================================================
//  FB CAPI — серверный хелпер
//  Отправляет события напрямую в Facebook Graph API
//  Используется в API Routes (не в браузере)
// ================================================================

import crypto from "crypto";

const FB_PIXEL_ID = process.env.FB_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const FB_ACCESS_TOKEN = process.env.FB_CAPI_ACCESS_TOKEN;
const FB_API_VERSION = "v21.0";

function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

interface PurchaseEventData {
  orderNumber: string;
  total: number;
  items: { id: string; name: string; price: number; quantity: number }[];
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIP?: string;
  userAgent?: string;
}

/**
 * Отправляет серверное событие покупки в FB Conversions API
 * Non-blocking — ошибки логируются, но не блокируют основной поток
 */
export function sendFBServerPurchaseEvent(data: PurchaseEventData) {
  if (!FB_PIXEL_ID || !FB_ACCESS_TOKEN) return;

  const userData: Record<string, unknown> = {};
  if (data.email) userData.em = [hashSHA256(data.email)];
  if (data.phone) userData.ph = [hashSHA256(data.phone.replace(/\D/g, ""))];
  if (data.firstName) userData.fn = [hashSHA256(data.firstName)];
  if (data.lastName) userData.ln = [hashSHA256(data.lastName)];
  if (data.clientIP) userData.client_ip_address = data.clientIP;
  if (data.userAgent) userData.client_user_agent = data.userAgent;

  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: userData,
    custom_data: {
      content_ids: data.items.map((i) => i.id),
      content_type: "product",
      value: data.total,
      currency: "UAH",
      num_items: data.items.reduce((s, i) => s + i.quantity, 0),
      order_id: data.orderNumber,
    },
  };

  const url = `https://graph.facebook.com/${FB_API_VERSION}/${FB_PIXEL_ID}/events`;

  // Fire and forget
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [event],
      access_token: FB_ACCESS_TOKEN,
    }),
  })
    .then((res) => {
      if (!res.ok) {
        res.json().then((body) => {
          console.error("[FB CAPI Server] Error:", body);
        });
      }
    })
    .catch((err) => {
      console.error("[FB CAPI Server] Network error:", err.message);
    });
}
