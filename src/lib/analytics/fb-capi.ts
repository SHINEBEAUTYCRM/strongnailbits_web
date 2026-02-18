// ================================================================
//  FB CAPI — клиентский хелпер
//  Отправляет серверное событие через /api/analytics/fb-capi
// ================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

interface FBCAPIEvent {
  event_name: string;
  event_source_url?: string;
  user_data?: {
    em?: string;
    ph?: string;
    fn?: string;
    ln?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: Record<string, any>;
}

/**
 * Получает значение FB cookie из document.cookie
 */
function getFBCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match?.[2];
}

/**
 * Отправляет серверное событие в FB Conversions API
 */
export async function sendFBServerEvent(event: FBCAPIEvent) {
  try {
    const enrichedEvent = {
      ...event,
      event_source_url: event.event_source_url || (typeof window !== "undefined" ? window.location.href : undefined),
      user_data: {
        ...event.user_data,
        fbc: event.user_data?.fbc || getFBCookie("_fbc"),
        fbp: event.user_data?.fbp || getFBCookie("_fbp"),
      },
    };

    // Не блокируем — fire and forget
    fetch("/api/analytics/fb-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enrichedEvent),
      keepalive: true,
    }).catch(() => {
      // Silently ignore — не ломаем UX если CAPI недоступен
    });
  } catch (err) {
    console.error('[FB-CAPI] Event send failed:', err);
  }
}

/**
 * Серверное событие покупки
 */
export function sendFBPurchaseEvent(data: {
  orderId: string;
  total: number;
  items: { id: string; name: string; price: number; quantity: number }[];
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}) {
  sendFBServerEvent({
    event_name: "Purchase",
    user_data: {
      em: data.email,
      ph: data.phone,
      fn: data.firstName,
      ln: data.lastName,
    },
    custom_data: {
      content_ids: data.items.map((i) => i.id),
      content_type: "product",
      value: data.total,
      currency: "UAH",
      num_items: data.items.reduce((s, i) => s + i.quantity, 0),
      order_id: data.orderId,
    },
  });
}
