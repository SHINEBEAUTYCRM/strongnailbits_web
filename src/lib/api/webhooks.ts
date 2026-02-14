// ================================================================
//  ShineShop OS — Webhooks Engine
//  HMAC-SHA256 підпис, відправка, retry з backoff, логування
// ================================================================

import { createAdminClient } from '@/lib/supabase/admin';
export type { WebhookEvent } from './webhook-events';
export { WEBHOOK_EVENTS } from './webhook-events';
import type { WebhookEvent } from './webhook-events';

interface WebhookRow {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  retry_count: number;
  timeout_ms: number;
  headers: Record<string, string>;
}

/** Retry delays in ms: 5s, 30s, 5min */
const RETRY_DELAYS = [5_000, 30_000, 300_000];

/**
 * HMAC-SHA256 підпис payload
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Відправити один вебхук (одна спроба)
 */
async function deliverWebhook(
  webhook: WebhookRow,
  event: string,
  payload: Record<string, unknown>,
  attempt: number,
): Promise<{ success: boolean; statusCode: number | null; responseBody: string | null; responseMs: number; error: string | null }> {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString(), attempt });
  const signature = await signPayload(body, webhook.secret);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': event,
    'X-Webhook-Signature': `sha256=${signature}`,
    'X-Webhook-Attempt': String(attempt),
    'User-Agent': 'ShineShop-Webhooks/1.0',
    ...(webhook.headers || {}),
  };

  const startMs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), webhook.timeout_ms || 10_000);

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseMs = Date.now() - startMs;
    let responseBody: string | null = null;
    try { responseBody = (await res.text()).slice(0, 2000); } catch (err) { console.error('[Webhooks] Response read failed:', err); }

    return {
      success: res.ok,
      statusCode: res.status,
      responseBody,
      responseMs,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      success: false,
      statusCode: null,
      responseBody: null,
      responseMs: Date.now() - startMs,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Записати результат доставки в БД
 */
async function logDelivery(
  webhookId: string,
  tenantId: string,
  event: string,
  payload: Record<string, unknown>,
  attempt: number,
  result: Awaited<ReturnType<typeof deliverWebhook>>,
) {
  try {
    const supabase = createAdminClient();
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhookId,
      tenant_id: tenantId,
      event,
      payload,
      attempt,
      status_code: result.statusCode,
      response_body: result.responseBody,
      response_ms: result.responseMs,
      error_message: result.error,
      success: result.success,
    });

    // Update webhook stats
    const { data: currentWh } = await supabase.from('webhooks').select('success_count, error_count').eq('id', webhookId).single();
    const updatePayload: Record<string, unknown> = {
      last_fired_at: new Date().toISOString(),
      last_status: result.statusCode,
      last_error: result.success ? null : result.error,
    };
    if (result.success) {
      updatePayload.success_count = (currentWh?.success_count || 0) + 1;
    } else {
      updatePayload.error_count = (currentWh?.error_count || 0) + 1;
    }
    await supabase.from('webhooks').update(updatePayload).eq('id', webhookId);
  } catch (err) {
    console.error('[Webhooks] Failed to log delivery:', err);
  }
}

/**
 * Основна функція: спрацьовує при подій.
 * Знаходить всі активні вебхуки підписані на цю подію і відправляє.
 * Non-blocking — не блокує основний flow.
 */
export async function fireWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>,
  tenantId?: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Find all active webhooks subscribed to this event
    let query = supabase
      .from('webhooks')
      .select('*')
      .eq('is_active', true)
      .contains('events', [event]);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: webhooks, error } = await query;

    if (error || !webhooks || webhooks.length === 0) return;

    // Fire all webhooks in parallel (non-blocking)
    for (const webhook of webhooks as WebhookRow[]) {
      // Fire and forget with retry
      deliverWithRetry(webhook, event, payload).catch(err => {
        console.error(`[Webhooks] Retry failed for ${webhook.id}:`, err);
      });
    }
  } catch (err) {
    console.error('[Webhooks] fireWebhook error:', err);
  }
}

/**
 * Deliver with retry logic
 */
async function deliverWithRetry(
  webhook: WebhookRow,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const maxAttempts = webhook.retry_count || 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await deliverWebhook(webhook, event, payload, attempt);
    await logDelivery(webhook.id, webhook.tenant_id, event, payload, attempt, result);

    if (result.success) return;

    // Wait before retry (unless it's the last attempt)
    if (attempt < maxAttempts) {
      const delay = RETRY_DELAYS[attempt - 1] || 300_000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'whsec_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
