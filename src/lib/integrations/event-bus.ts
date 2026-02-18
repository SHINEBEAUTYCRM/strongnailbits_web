// ================================================================
//  Event Bus — надійна черга подій для інтеграцій
// ================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { getDefaultTenantId } from './base';

// ── Топіки подій ──
export type EventTopic =
  | 'order.created' | 'order.updated' | 'order.paid' | 'order.shipped' | 'order.delivered' | 'order.cancelled'
  | 'payment.created' | 'payment.paid' | 'payment.failed' | 'payment.refunded'
  | 'shipment.created' | 'shipment.status_changed' | 'shipment.delivered'
  | 'product.updated' | 'product.stock_changed'
  | 'client.created' | 'client.updated'
  | 'receipt.created' | 'receipt.returned'     // ПРРО
  | 'sms.sent' | 'sms.delivered' | 'sms.failed'
  | 'message.received' | 'message.sent';       // Telegram/Viber

// ── Публікувати подію ──
export async function publishEvent(
  topic: EventTopic,
  payload: Record<string, unknown>,
  targetSlug?: string,
): Promise<string> {
  const tenantId = await getDefaultTenantId();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('event_outbox')
    .insert({
      tenant_id: tenantId,
      topic,
      payload,
      target_slug: targetSlug || null,
      status: 'pending',
      next_retry_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to publish event: ${error.message}`);
  return data!.id;
}

// ── Записати вхідну подію (від зовнішнього сервісу) ──
export async function receiveEvent(
  providerSlug: string,
  topic: EventTopic,
  payload: Record<string, unknown>,
  externalEventId?: string,
): Promise<string | null> {
  const tenantId = await getDefaultTenantId();
  const supabase = createAdminClient();

  // Дедуплікація
  if (externalEventId) {
    const { data: existing } = await supabase
      .from('event_inbox')
      .select('id')
      .eq('provider_slug', providerSlug)
      .eq('external_event_id', externalEventId)
      .single();
    if (existing) return null; // Дублікат — ігноруємо
  }

  const { data, error } = await supabase
    .from('event_inbox')
    .insert({
      tenant_id: tenantId,
      provider_slug: providerSlug,
      external_event_id: externalEventId || null,
      topic,
      payload,
      status: 'received',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to receive event: ${error.message}`);
  return data!.id;
}

// ── Записати результат доставки ──
export async function logDelivery(
  eventId: string,
  destination: string,
  result: {
    httpStatus?: number;
    responseSnippet?: string;
    durationMs: number;
    success: boolean;
    errorMessage?: string;
    attempt: number;
  },
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('event_deliveries').insert({
    event_id: eventId,
    destination,
    http_status: result.httpStatus || null,
    response_snippet: result.responseSnippet?.slice(0, 500) || null,
    duration_ms: result.durationMs,
    success: result.success,
    error_message: result.errorMessage || null,
    attempt: result.attempt,
  });
}

// ── Retry логіка: експоненціальна затримка ──
export function getNextRetryDelay(attempt: number): number {
  // 30s, 2m, 8m, 30m, 2h
  const delays = [30, 120, 480, 1800, 7200];
  const index = Math.min(attempt - 1, delays.length - 1);
  return delays[index] * 1000; // ms
}

// ── Обробити pending події ──
export async function processOutbox(limit: number = 10): Promise<number> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Взяти pending/failed події з next_retry_at <= now
  const { data: events } = await supabase
    .from('event_outbox')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lte('next_retry_at', now)
    .lt('attempts', 5)
    .order('created_at')
    .limit(limit);

  if (!events?.length) return 0;

  let processed = 0;
  for (const event of events) {
    // Позначити як processing
    await supabase
      .from('event_outbox')
      .update({ status: 'processing' })
      .eq('id', event.id);

    // TODO: Виконати delivery (webhook/connector)
    // Поки що просто помічаємо як sent
    const attempts = (event.attempts || 0) + 1;

    await supabase
      .from('event_outbox')
      .update({
        status: 'sent',
        attempts,
        processed_at: new Date().toISOString(),
      })
      .eq('id', event.id);

    processed++;
  }

  return processed;
}

// ── Health Check ──
export async function updateHealthStatus(
  serviceSlug: string,
  status: 'healthy' | 'degraded' | 'down',
  details?: {
    responseTimeMs?: number;
    error?: string;
    extra?: Record<string, unknown>;
  },
): Promise<void> {
  const tenantId = await getDefaultTenantId();
  const supabase = createAdminClient();

  const isSuccess = status === 'healthy';
  const now = new Date().toISOString();

  // Отримати поточний стан для consecutive_failures
  const { data: current } = await supabase
    .from('integration_health')
    .select('consecutive_failures')
    .eq('tenant_id', tenantId)
    .eq('service_slug', serviceSlug)
    .single();

  const consecutiveFailures = isSuccess ? 0 : ((current?.consecutive_failures || 0) + 1);

  const upsertData: Record<string, unknown> = {
    tenant_id: tenantId,
    service_slug: serviceSlug,
    status,
    response_time_ms: details?.responseTimeMs || null,
    last_check_at: now,
    last_error: details?.error || null,
    consecutive_failures: consecutiveFailures,
    details: details?.extra || {},
  };

  if (isSuccess) {
    upsertData.last_success_at = now;
  }

  await supabase
    .from('integration_health')
    .upsert(upsertData, { onConflict: 'tenant_id,service_slug' });
}

// ── Статистика подій ──
export async function getEventStats(): Promise<{
  outbox: { pending: number; failed: number; sent: number; dead: number };
  inbox: { received: number; processed: number; failed: number };
  deliveries: { total: number; success: number; failed: number; avgDurationMs: number };
}> {
  const tenantId = await getDefaultTenantId();
  const supabase = createAdminClient();

  // Outbox stats
  const { data: outboxRaw } = await supabase
    .from('event_outbox')
    .select('status')
    .eq('tenant_id', tenantId);

  const outbox = { pending: 0, failed: 0, sent: 0, dead: 0 };
  for (const e of outboxRaw || []) {
    if (e.status in outbox) outbox[e.status as keyof typeof outbox]++;
  }

  // Inbox stats
  const { data: inboxRaw } = await supabase
    .from('event_inbox')
    .select('status')
    .eq('tenant_id', tenantId);

  const inbox = { received: 0, processed: 0, failed: 0 };
  for (const e of inboxRaw || []) {
    if (e.status in inbox) inbox[e.status as keyof typeof inbox]++;
  }

  // Delivery stats (last 24h)
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const { data: deliveriesRaw } = await supabase
    .from('event_deliveries')
    .select('success, duration_ms')
    .gte('created_at', yesterday);

  const deliveries = { total: 0, success: 0, failed: 0, avgDurationMs: 0 };
  let totalDuration = 0;
  for (const d of deliveriesRaw || []) {
    deliveries.total++;
    if (d.success) deliveries.success++;
    else deliveries.failed++;
    totalDuration += d.duration_ms || 0;
  }
  deliveries.avgDurationMs = deliveries.total > 0 ? Math.round(totalDuration / deliveries.total) : 0;

  return { outbox, inbox, deliveries };
}

// ── Отримати всі health статуси ──
export async function getAllHealthStatuses(): Promise<
  Array<{
    service_slug: string;
    status: string;
    response_time_ms: number | null;
    last_check_at: string | null;
    last_success_at: string | null;
    last_error: string | null;
    consecutive_failures: number;
    details: Record<string, unknown>;
  }>
> {
  const tenantId = await getDefaultTenantId();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('integration_health')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('service_slug');

  return data || [];
}
