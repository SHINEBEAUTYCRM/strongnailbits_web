export { getAnalyticsConfig } from "./config";
export type { AnalyticsConfig } from "./config";

export {
  trackPageView,
  trackViewItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackBeginCheckout,
  trackPurchase,
  trackSearch,
  trackViewItemList,
  trackCustomEvent,
} from "./tracker";
export type { ProductItem, PurchaseData } from "./tracker";

export { sendFBServerEvent, sendFBPurchaseEvent } from "./fb-capi";
