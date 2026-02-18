-- ================================================================
--  ShineShop OS — Webhooks Schema
--  Таблиці для системи вебхуків (сповіщення зовнішніх систем)
-- ================================================================


-- ================================================================
--  1. WEBHOOKS — Конфігурація вебхуків
-- ================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,                              -- "1С Повідомлення", "Telegram Bot"
  url           TEXT        NOT NULL,                              -- https://example.com/webhook
  secret        TEXT        NOT NULL,                              -- HMAC-SHA256 ключ для підпису
  events        TEXT[]      NOT NULL DEFAULT '{}',                 -- {'order.created', 'product.updated'}
  is_active     BOOLEAN     DEFAULT true,
  retry_count   INTEGER     DEFAULT 3,                             -- кількість повторних спроб
  timeout_ms    INTEGER     DEFAULT 10000,                         -- таймаут запиту (мс)
  headers       JSONB       DEFAULT '{}'::jsonb,                   -- додаткові заголовки
  last_status   INTEGER,                                           -- останній HTTP-статус
  last_error    TEXT,                                              -- останнє повідомлення про помилку
  last_fired_at TIMESTAMPTZ,                                      -- коли останній раз спрацював
  success_count INTEGER     DEFAULT 0,
  error_count   INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant    ON webhooks (tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active    ON webhooks (is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events    ON webhooks USING GIN (events);

CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE webhooks IS 'Конфігурація вебхуків. events = масив подій для підписки. secret = ключ для HMAC-SHA256.';


-- ================================================================
--  2. WEBHOOK_DELIVERIES — Лог доставки вебхуків
-- ================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    UUID        NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  tenant_id     UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  event         TEXT        NOT NULL,                              -- order.created
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,          -- тіло запиту
  attempt       INTEGER     NOT NULL DEFAULT 1,                    -- номер спроби (1, 2, 3)
  status_code   INTEGER,                                           -- HTTP-статус відповіді
  response_body TEXT,                                              -- тіло відповіді (обрізане)
  response_ms   INTEGER,                                           -- час відповіді (мс)
  error_message TEXT,                                              -- повідомлення про помилку
  success       BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant  ON webhook_deliveries (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event   ON webhook_deliveries (event);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries (created_at DESC);

COMMENT ON TABLE webhook_deliveries IS 'Лог доставки вебхуків. Зберігається 30 днів.';


-- ================================================================
--  3. ALTER API_TOKENS — Додати поля безпеки
-- ================================================================

ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS allowed_ips    TEXT[];
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS allowed_origins TEXT[];
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS description    TEXT;


-- ================================================================
--  ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE webhooks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries  ENABLE ROW LEVEL SECURITY;

-- Доступ тільки через service_role (адмін)


-- ================================================================
--  КОРИСНІ ФУНКЦІЇ
-- ================================================================

-- Автоматичне видалення старих логів вебхуків (> 30 днів)
CREATE OR REPLACE FUNCTION cleanup_webhook_deliveries()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_deliveries WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_webhook_deliveries IS 'Видалити логи вебхуків старші 30 днів.';
