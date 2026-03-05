// ================================================================
//  StrongNailBits OS — Webhook Events (shared client/server constants)
// ================================================================

/** Supported webhook events */
export type WebhookEvent =
  | 'order.created'
  | 'order.status_changed'
  | 'order.synced'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.synced'
  | 'product.updated'
  | 'product.stock_updated'
  | 'stock.updated'
  | 'payment.received'
  | 'bonus.created';

export const WEBHOOK_EVENTS: { event: WebhookEvent; label: string }[] = [
  { event: 'order.created', label: 'Нове замовлення' },
  { event: 'order.status_changed', label: 'Зміна статусу замовлення' },
  { event: 'order.synced', label: 'Замовлення синхронізовано' },
  { event: 'customer.created', label: 'Новий клієнт' },
  { event: 'customer.updated', label: 'Клієнт оновлено (1С)' },
  { event: 'customer.synced', label: 'Клієнт синхронізовано' },
  { event: 'product.updated', label: 'Товар оновлено' },
  { event: 'product.stock_updated', label: 'Залишки оновлено (1С)' },
  { event: 'stock.updated', label: 'Залишки оновлено' },
  { event: 'payment.received', label: 'Нова оплата' },
  { event: 'bonus.created', label: 'Бонусна операція' },
];
