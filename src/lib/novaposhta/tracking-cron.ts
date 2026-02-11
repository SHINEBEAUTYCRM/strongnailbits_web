/**
 * Nova Poshta — Automatic Tracking Updates
 *
 * Runs every 15 min via cron.
 * Checks all active shipments and updates order statuses.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { trackShipments, getStatusLabel, isNPConfigured } from "./client";
import { notifyOrderStatusChanged } from "@/lib/telegram/notify";

// NP status stage → our order status mapping
const STAGE_TO_ORDER_STATUS: Record<string, string> = {
  created: "processing",
  in_transit: "shipped",
  arrived: "shipped",
  delivered: "delivered",
  returned: "cancelled",
  problem: "cancelled",
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

    // Get orders with tracking_number (or ttn) that are not yet in final status
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, ttn, tracking_number, status, np_status, shipping_address")
      .or("ttn.not.is.null,tracking_number.not.is.null")
      .in("status", ["new", "processing", "shipped"])
      .limit(100);

    if (error || !orders || orders.length === 0) {
      return result;
    }

    result.checked = orders.length;

    // Collect TTNs (support both column names)
    const ttns = orders
      .map((o) => o.tracking_number || o.ttn)
      .filter(Boolean) as string[];

    if (ttns.length === 0) return result;

    // Batch track all TTNs
    const trackingDocs = await trackShipments(ttns);
    const trackingMap = new Map(trackingDocs.map((d) => [d.Number, d]));

    // Update orders
    for (const order of orders) {
      const ttn = order.tracking_number || order.ttn;
      if (!ttn) continue;

      const doc = trackingMap.get(ttn);
      if (!doc) continue;

      const npStatus = getStatusLabel(doc.StatusCode);
      const newOrderStatus = STAGE_TO_ORDER_STATUS[npStatus.stage];

      // Skip if status hasn't changed or no mapping
      if (!newOrderStatus || newOrderStatus === order.status) {
        // Still update NP status text & last checked
        await supabase
          .from("orders")
          .update({
            np_status: npStatus.stage,
            np_status_text: doc.Status,
            np_last_checked: new Date().toISOString(),
            np_estimated_delivery: doc.ScheduledDeliveryDate || null,
          })
          .eq("id", order.id);
        continue;
      }

      // Update order status + NP tracking info
      const updateData: Record<string, unknown> = {
        status: newOrderStatus,
        np_status: npStatus.stage,
        np_status_text: doc.Status,
        np_last_checked: new Date().toISOString(),
        np_estimated_delivery: doc.ScheduledDeliveryDate || null,
      };

      if (newOrderStatus === "delivered" && doc.ActualDeliveryDate) {
        updateData.delivered_at = doc.ActualDeliveryDate;
        updateData.np_actual_delivery = doc.ActualDeliveryDate;
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
        ttn,
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
