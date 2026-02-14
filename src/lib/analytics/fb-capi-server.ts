// ================================================================
//  FB CAPI — серверный хелпер
//  Отправляет события напрямую в Facebook Graph API
//  Используется в API Routes (не в браузере)
// ================================================================

import crypto from "crypto";
import { getServiceConfig } from '@/lib/integrations/config-resolver';

const FB_API_VERSION = "v21.0";

function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function getFBConfig(): Promise<{ pixelId: string; accessToken: string } | null> {
  const config = await getServiceConfig('facebook-pixel');
  const pixelId = config?.pixel_id;
  const accessToken = config?.access_token;
  if (!pixelId || !accessToken) return null;
  return { pixelId, accessToken };
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
export async function sendFBServerPurchaseEvent(data: PurchaseEventData) {
  const fb = await getFBConfig();
  if (!fb) return;

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

  const url = `https://graph.facebook.com/${FB_API_VERSION}/${fb.pixelId}/events`;

  // Fire and forget
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [event],
      access_token: fb.accessToken,
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
