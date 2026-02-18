"use client";

// ================================================================
//  TrackProductView — трекинг просмотра товара
//  Вставляется на страницу товара как клиентский компонент
// ================================================================

import { useEffect } from "react";
import { trackViewItem } from "@/lib/analytics/tracker";

interface TrackProductViewProps {
  productId: string;
  name: string;
  price: number;
  brand?: string;
  category?: string;
}

export function TrackProductView({
  productId,
  name,
  price,
  brand,
  category,
}: TrackProductViewProps) {
  useEffect(() => {
    trackViewItem({
      item_id: productId,
      item_name: name,
      price,
      item_brand: brand,
      item_category: category,
    });
  }, [productId, name, price, brand, category]);

  return null;
}
