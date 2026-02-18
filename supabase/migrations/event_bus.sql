-- ================================================================
-- Event Bus — надійна черга подій для інтеграцій
-- ⚠️ Виконати вручну в Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Вихідні події (DenGrow/ShineShop → зовнішні сервіси)
CREATE TABLE IF NOT EXISTS event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_settings(id),
  topic TEXT NOT NULL,                    -- 'order.created', 'order.paid', 'shipment.created', etc.
  payload JSONB NOT NULL DEFAULT '{}',
  target_slug TEXT,                       -- Конкретний сервіс або NULL = всі підписники
  status TEXT NOT NULL DEFAULT 'pending', -- pending → processing → sent → failed → dead
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT valid_outbox_status CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead'))
);

-- 2. Вхідні події (зовнішні сервіси → ShineShop)
CREATE TABLE IF NOT EXISTS event_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_settings(id),
  provider_slug TEXT NOT NULL,             -- 'nova-poshta', 'liqpay', 'checkbox', etc.
  external_event_id TEXT,                  -- ID від провайдера (для дедуплікації)
  topic TEXT NOT NULL,                     -- 'payment.paid', 'shipment.status_changed', etc.
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'received', -- received → processing → processed → failed
  last_error TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT valid_inbox_status CHECK (status IN ('received', 'processing', 'processed', 'failed'))
);

-- 3. Delivery Log — лог кожної спроби доставки
CREATE TABLE IF NOT EXISTS event_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,                  -- → event_outbox.id
  destination TEXT NOT NULL,               -- URL або slug сервісу
  http_status INT,
  response_snippet TEXT,                   -- Перші 500 символів відповіді
  duration_ms INT,
  attempt INT DEFAULT 1,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Health Check результати
CREATE TABLE IF NOT EXISTS integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_settings(id),
  service_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',  -- healthy, degraded, down, unknown
  response_time_ms INT,
  last_check_at TIMESTAMPTZ DEFAULT now(),
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  consecutive_failures INT DEFAULT 0,
  details JSONB DEFAULT '{}',              -- Додаткова інфо (версія API, ліміти)
  UNIQUE(tenant_id, service_slug)
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_event_outbox_status ON event_outbox(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_event_outbox_topic ON event_outbox(topic);
CREATE INDEX IF NOT EXISTS idx_event_inbox_provider ON event_inbox(provider_slug, status);
CREATE INDEX IF NOT EXISTS idx_event_inbox_dedup ON event_inbox(provider_slug, external_event_id);
CREATE INDEX IF NOT EXISTS idx_event_deliveries_event ON event_deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_integration_health_slug ON integration_health(tenant_id, service_slug);
