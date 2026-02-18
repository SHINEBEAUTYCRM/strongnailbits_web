"use client";

// ================================================================
//  TrackPurchase — трекинг покупки (страница success)
// ================================================================

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/analytics/tracker";

interface TrackPurchaseProps {
  orderNumber: string;
  total: number;
  items: { id: string; name: string; price: number; quantity: number }[];
}

export function TrackPurchase({ orderNumber, total, items }: TrackPurchaseProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    trackPurchase({
      transaction_id: orderNumber,
      value: total,
      currency: "UAH",
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }, [orderNumber, total, items]);

  return null;
}
