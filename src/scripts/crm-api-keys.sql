-- ================================================================
--  Shine Shop B2B — CRM API Integration Tables
--  Таблиці для інтеграції з Shine Beauty CRM
-- ================================================================

-- ────────────────────────────────────────────────
--  1. CRM API Keys — автентифікація CRM-запитів
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_api_keys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,           -- "Shine Beauty CRM"
  api_key       TEXT        NOT NULL UNIQUE,    -- plain-text ключ (crm_...)
  permissions   JSONB       DEFAULT '["read_products", "create_orders"]'::jsonb,
  is_active     BOOLEAN     DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_api_keys_api_key   ON crm_api_keys (api_key);
CREATE INDEX IF NOT EXISTS idx_crm_api_keys_is_active ON crm_api_keys (is_active);

-- Вставити перший ключ (поміняти на реальний потім)
INSERT INTO crm_api_keys (name, api_key, permissions)
VALUES (
  'Shine Beauty CRM',
  'crm_' || encode(gen_random_bytes(32), 'hex'),
  '["read_products", "create_orders"]'::jsonb
);


-- ────────────────────────────────────────────────
--  2. CRM Orders — замовлення створені через CRM
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_orders (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT           NOT NULL UNIQUE,
  source           TEXT           DEFAULT 'shine_beauty_crm',
  salon_name       TEXT,
  contact_phone    TEXT,
  contact_email    TEXT,
  items            JSONB          NOT NULL,  -- [{product_id, name, sku, quantity, price, total}]
  subtotal         NUMERIC(10,2)  NOT NULL,
  status           TEXT           DEFAULT 'pending',  -- pending → confirmed → shipped → delivered → cancelled
  notes            TEXT,
  delivery_method  TEXT,
  tracking_number  TEXT,
  created_at       TIMESTAMPTZ    DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_orders_order_number ON crm_orders (order_number);
CREATE INDEX IF NOT EXISTS idx_crm_orders_status       ON crm_orders (status);
CREATE INDEX IF NOT EXISTS idx_crm_orders_source       ON crm_orders (source);
CREATE INDEX IF NOT EXISTS idx_crm_orders_created_at   ON crm_orders (created_at DESC);

-- Trigger для автооновлення updated_at
CREATE TRIGGER trg_crm_orders_updated_at
  BEFORE UPDATE ON crm_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Номер замовлення (CRM-YYYY-NNNN) генерується в коді через COUNT існуючих
