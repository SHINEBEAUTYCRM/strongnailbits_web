/**
 * Nova Poshta — Automatic Tracking Updates
 *
 * Runs every 15 min via cron.
 * Checks all active shipments and updates order statuses.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { trackShipments, getStatusLabel, isNPConfigured } from "./client";
import { notifyOrderStatusChanged } from "@/lib/telegram/notify";

// NP status codes → our order status mapping
const NP_TO_ORDER_STATUS: Record<string, string> = {
  // In transit
  in_transit: "shipped",
  // Arrived at warehouse — still "shipped"
  arrived: "shipped",
  // Delivered / received
  delivered: "delivered",
  // Returned — cancelled
  returned: "cancelled",
};

interface TrackingResult {
  checked: number;
  updated: number;
  errors: string[];
}

/**
 * Check all active shipments and update order statuses.
 */
export async function updateShipmentStatuses(): Promise<TrackingResult> {
  const result: TrackingResult = { checked: 0, updated: 0, errors: [] };

  if (!(await isNPConfigured())) {
    return { ...result, errors: ["Nova Poshta not configured"] };
  }

  try {
    const supabase = createAdminClient();

    // Get orders with TTN that are not yet delivered/cancelled
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, ttn, status, shipping_address")
      .not("ttn", "is", null)
      .not("ttn", "eq", "")
      .in("status", ["new", "processing", "shipped"])
      .limit(100);

    if (error || !orders || orders.length === 0) {
      return result;
    }

    result.checked = orders.length;

    // Batch track all TTNs
    const ttns = orders.map((o) => o.ttn!).filter(Boolean);
    if (ttns.length === 0) return result;

    const trackingDocs = await trackShipments(ttns);

    // Create a map: TTN → tracking data
    const trackingMap = new Map(trackingDocs.map((d) => [d.Number, d]));

    // Update orders
    for (const order of orders) {
      const doc = trackingMap.get(order.ttn!);
      if (!doc) continue;

      const npStatus = getStatusLabel(doc.StatusCode);
      const newOrderStatus = NP_TO_ORDER_STATUS[npStatus.stage];

      // Skip if status hasn't changed or no mapping
      if (!newOrderStatus || newOrderStatus === order.status) continue;

      // Update order
      const updateData: Record<string, unknown> = {
        status: newOrderStatus,
        np_status: doc.Status,
        np_status_code: doc.StatusCode,
      };

      // Set delivered_at for delivered orders
      if (newOrderStatus === "delivered" && doc.ActualDeliveryDate) {
        updateData.delivered_at = doc.ActualDeliveryDate;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order.id);

      if (updateError) {
        result.errors.push(`Order ${order.order_number}: ${updateError.message}`);
        continue;
      }

      result.updated++;

      // Notify about status change (fire-and-forget)
      const shippingAddr = order.shipping_address as Record<string, string> | null;
      notifyOrderStatusChanged({
        orderNumber: order.order_number,
        oldStatus: order.status,
        newStatus: newOrderStatus,
        ttn: order.ttn!,
        npStatus: `${npStatus.emoji} ${npStatus.label}`,
        customerName: shippingAddr?.recipient || "Невідомий",
      }).catch(() => {});
    }

    return result;
  } catch (err) {
    console.error("[NP Tracking Cron] Error:", err);
    return {
      ...result,
      errors: [err instanceof Error ? err.message : "Unknown error"],
    };
  }
}
