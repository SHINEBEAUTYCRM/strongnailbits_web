// ================================================================
//  Analytics Tracker
//  Универсальный трекер e-commerce событий
//  Отправляет события в GA4, FB Pixel, PostHog, TikTok одновременно
// ================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

// -----------------------------------------------------------------
//  Типы e-commerce событий
// -----------------------------------------------------------------

export interface ProductItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  price: number;
  quantity?: number;
  item_variant?: string;
  discount?: number;
  currency?: string;
}

export interface PurchaseData {
  transaction_id: string;
  value: number;
  currency: string;
  items: ProductItem[];
  shipping?: number;
  tax?: number;
}

// -----------------------------------------------------------------
//  Хелпери доступу до window объектов
// -----------------------------------------------------------------

function gtag(...args: any[]) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag(...args);
  }
}

function fbq(...args: any[]) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq(...args);
  }
}

function posthog() {
  if (typeof window !== 'undefined' && (window as any).posthog) {
    return (window as any).posthog;
  }
  return null;
}

// -----------------------------------------------------------------
//  Просмотр страницы
// -----------------------------------------------------------------

export function trackPageView(url: string, title?: string) {
  // GA4 (если без GTM)
  gtag('event', 'page_view', {
    page_location: url,
    page_title: title,
  });

  // FB Pixel
  fbq('track', 'PageView');

  // PostHog
  posthog()?.capture('$pageview', { $current_url: url });
}

// -----------------------------------------------------------------
//  Просмотр товара
// -----------------------------------------------------------------

export function trackViewItem(item: ProductItem) {
  // GA4
  gtag('event', 'view_item', {
    currency: item.currency || 'UAH',
    value: item.price,
    items: [formatGA4Item(item)],
  });

  // FB Pixel
  fbq('track', 'ViewContent', {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: 'product',
    value: item.price,
    currency: item.currency || 'UAH',
  });

  // PostHog
  posthog()?.capture('view_item', {
    product_id: item.item_id,
    product_name: item.item_name,
    price: item.price,
    brand: item.item_brand,
    category: item.item_category,
  });
}

// -----------------------------------------------------------------
//  Добавление в корзину
// -----------------------------------------------------------------

export function trackAddToCart(item: ProductItem) {
  // GA4
  gtag('event', 'add_to_cart', {
    currency: item.currency || 'UAH',
    value: item.price * (item.quantity || 1),
    items: [formatGA4Item(item)],
  });

  // FB Pixel
  fbq('track', 'AddToCart', {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: 'product',
    value: item.price * (item.quantity || 1),
    currency: item.currency || 'UAH',
    num_items: item.quantity || 1,
  });

  // PostHog
  posthog()?.capture('add_to_cart', {
    product_id: item.item_id,
    product_name: item.item_name,
    price: item.price,
    quantity: item.quantity || 1,
    brand: item.item_brand,
    category: item.item_category,
  });
}

// -----------------------------------------------------------------
//  Удаление из корзины
// -----------------------------------------------------------------

export function trackRemoveFromCart(item: ProductItem) {
  // GA4
  gtag('event', 'remove_from_cart', {
    currency: item.currency || 'UAH',
    value: item.price * (item.quantity || 1),
    items: [formatGA4Item(item)],
  });

  // PostHog
  posthog()?.capture('remove_from_cart', {
    product_id: item.item_id,
    product_name: item.item_name,
    price: item.price,
    quantity: item.quantity || 1,
  });
}

// -----------------------------------------------------------------
//  Начало оформления
// -----------------------------------------------------------------

export function trackBeginCheckout(items: ProductItem[], value: number) {
  // GA4
  gtag('event', 'begin_checkout', {
    currency: 'UAH',
    value,
    items: items.map(formatGA4Item),
  });

  // FB Pixel
  fbq('track', 'InitiateCheckout', {
    content_ids: items.map(i => i.item_id),
    content_type: 'product',
    value,
    currency: 'UAH',
    num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
  });

  // PostHog
  posthog()?.capture('begin_checkout', {
    value,
    item_count: items.length,
  });
}

// -----------------------------------------------------------------
//  Покупка
// -----------------------------------------------------------------

export function trackPurchase(data: PurchaseData) {
  // GA4
  gtag('event', 'purchase', {
    transaction_id: data.transaction_id,
    value: data.value,
    currency: data.currency || 'UAH',
    shipping: data.shipping || 0,
    tax: data.tax || 0,
    items: data.items.map(formatGA4Item),
  });

  // FB Pixel
  fbq('track', 'Purchase', {
    content_ids: data.items.map(i => i.item_id),
    content_type: 'product',
    value: data.value,
    currency: data.currency || 'UAH',
    num_items: data.items.reduce((s, i) => s + (i.quantity || 1), 0),
  });

  // PostHog
  posthog()?.capture('purchase', {
    transaction_id: data.transaction_id,
    value: data.value,
    currency: data.currency || 'UAH',
    item_count: data.items.length,
  });
}

// -----------------------------------------------------------------
//  Поиск
// -----------------------------------------------------------------

export function trackSearch(query: string, resultsCount?: number) {
  // GA4
  gtag('event', 'search', {
    search_term: query,
  });

  // FB Pixel
  fbq('track', 'Search', {
    search_string: query,
    content_type: 'product',
  });

  // PostHog
  posthog()?.capture('search', {
    query,
    results_count: resultsCount,
  });
}

// -----------------------------------------------------------------
//  Просмотр списка товаров (категория)
// -----------------------------------------------------------------

export function trackViewItemList(listName: string, items: ProductItem[]) {
  // GA4
  gtag('event', 'view_item_list', {
    item_list_id: listName,
    item_list_name: listName,
    items: items.slice(0, 20).map(formatGA4Item),
  });

  // PostHog
  posthog()?.capture('view_item_list', {
    list_name: listName,
    item_count: items.length,
  });
}

// -----------------------------------------------------------------
//  Кастомное событие
// -----------------------------------------------------------------

export function trackCustomEvent(name: string, params?: Record<string, any>) {
  gtag('event', name, params);
  posthog()?.capture(name, params);
}

// -----------------------------------------------------------------
//  GA4 item formatter
// -----------------------------------------------------------------

function formatGA4Item(item: ProductItem) {
  return {
    item_id: item.item_id,
    item_name: item.item_name,
    item_brand: item.item_brand,
    item_category: item.item_category,
    price: item.price,
    quantity: item.quantity || 1,
    discount: item.discount || 0,
  };
}
