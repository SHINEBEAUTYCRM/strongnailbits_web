"use client";

// ================================================================
//  TrackCheckout — трекинг начала оформления заказа
// ================================================================

import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cart";
import { trackBeginCheckout } from "@/lib/analytics/tracker";

export function TrackCheckout() {
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);

  useEffect(() => {
    if (items.length === 0) return;

    trackBeginCheckout(
      items.map((item) => ({
        item_id: item.product_id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      getTotal()
    );
    // Трекаем только при первом рендере страницы checkout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
