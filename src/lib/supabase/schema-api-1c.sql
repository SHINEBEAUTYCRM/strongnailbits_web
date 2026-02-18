-- ================================================================
--  ShineShop OS — 1С API Integration Schema
--  Міграція для REST API інтеграції з 1С
-- ================================================================


-- ================================================================
--  1. API_TOKENS — Токени для зовнішнього API
-- ================================================================

CREATE TABLE IF NOT EXISTS api_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,                              -- "1С Обмін", "Telegram Bot"
  token_hash    TEXT        NOT NULL,                              -- SHA-256 хеш токена
  token_prefix  TEXT        NOT NULL,                              -- "sk_live_abc1" (перші 12 символів)
  permissions   JSONB       DEFAULT '[]'::jsonb,                   -- ["products:read","products:write",...]
  rate_limit    INTEGER     DEFAULT 100,                           -- запитів на хвилину
  is_active     BOOLEAN     DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,                                       -- null = безстроковий
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_tokens_hash     ON api_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_tenant          ON api_tokens (tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_active          ON api_tokens (is_active);
CREATE INDEX IF NOT EXISTS idx_api_tokens_prefix          ON api_tokens (token_prefix);

CREATE TRIGGER trg_api_tokens_updated_at
  BEFORE UPDATE ON api_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE api_tokens IS 'API-токени для зовнішніх інтеграцій (1С, боти). token_hash = SHA-256. Показується один раз при створенні.';


-- ================================================================
--  2. API_REQUEST_LOG — Лог всіх API-запитів
-- ================================================================

CREATE TABLE IF NOT EXISTS api_request_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id        UUID        REFERENCES api_tokens(id) ON DELETE SET NULL,
  tenant_id       UUID        REFERENCES tenant_settings(id) ON DELETE CASCADE,
  method          TEXT        NOT NULL,                             -- GET, POST, PATCH, DELETE
  endpoint        TEXT        NOT NULL,                             -- /v1/products
  status_code     INTEGER     NOT NULL,                             -- 200, 400, 401, 500
  request_body    JSONB,                                            -- тіло запиту (обрізане до 10KB)
  response_time_ms INTEGER,
  error_message   TEXT,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_log_token     ON api_request_log (token_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_log_tenant    ON api_request_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_log_endpoint  ON api_request_log (endpoint);
CREATE INDEX IF NOT EXISTS idx_api_log_status    ON api_request_log (status_code);
CREATE INDEX IF NOT EXISTS idx_api_log_created   ON api_request_log (created_at DESC);

COMMENT ON TABLE api_request_log IS 'Лог API-запитів від зовнішніх систем. Зберігається 90 днів.';


-- ================================================================
--  3. ALTER PRODUCTS — Додати поля для 1С
-- ================================================================

-- external_id — UUID товару в 1С
ALTER TABLE products ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
-- Штрихкод
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
-- Одиниця виміру
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'шт';
-- Вага в грамах (існуючий weight — в кг)
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_g INTEGER;

CREATE INDEX IF NOT EXISTS idx_products_external_id ON products (external_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode     ON products (barcode);

COMMENT ON COLUMN products.external_id IS 'UUID товару в 1С. Використовується для upsert при синхронізації.';


-- ================================================================
--  4. ALTER PROFILES (CUSTOMERS) — Додати поля для 1С
-- ================================================================

-- external_id — UUID контрагента в 1С
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
-- Код ЄДРПОУ
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_code TEXT;
-- B2B-клієнт
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN DEFAULT false;
-- Кредитний ліміт
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0;
-- Термін оплати (днів)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 0;
-- Баланс (від'ємне = борг)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0;
-- Рівень лояльності
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze'
  CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum'));
-- Бонусні бали
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loyalty_points DECIMAL(12,2) DEFAULT 0;
-- Менеджер
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_name TEXT;
-- Дата синхронізації з 1С
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_external_id ON profiles (external_id);
CREATE INDEX IF NOT EXISTS idx_profiles_synced_at   ON profiles (synced_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_b2b      ON profiles (is_b2b);

COMMENT ON COLUMN profiles.external_id IS 'UUID контрагента в 1С. Використовується для зв''язку сайт ↔ 1С.';
COMMENT ON COLUMN profiles.balance IS 'Баланс клієнта. Від''ємне значення = борг.';


-- ================================================================
--  5. ALTER ORDERS — Додати поля для 1С
-- ================================================================

-- external_id — UUID замовлення в 1С
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
-- Дата синхронізації з 1С
ALTER TABLE orders ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
-- Бонуси використані
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bonus_used DECIMAL(10,2) DEFAULT 0;
-- Дата відправки
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_external_id ON orders (external_id);
CREATE INDEX IF NOT EXISTS idx_orders_synced_at   ON orders (synced_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_sync ON orders (status, synced_at);

COMMENT ON COLUMN orders.external_id IS 'UUID замовлення в 1С. Заповнюється після синхронізації.';


-- ================================================================
--  6. DOCUMENTS — Накладні / реалізації / повернення з 1С
-- ================================================================

CREATE TABLE IF NOT EXISTS documents (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  external_id           TEXT        NOT NULL,                      -- UUID документа в 1С
  customer_external_id  TEXT        NOT NULL,                      -- UUID клієнта в 1С
  profile_id            UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  doc_type              TEXT        NOT NULL CHECK (doc_type IN ('sale', 'return', 'invoice')),
  doc_number            TEXT        NOT NULL,
  doc_date              DATE        NOT NULL,
  total_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(12,2) DEFAULT 0,
  payment_status        TEXT        DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'failed')),
  ttn_number            TEXT,
  items                 JSONB       NOT NULL DEFAULT '[]'::jsonb,  -- масив рядків документа
  metadata              JSONB       DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_external   ON documents (tenant_id, external_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer          ON documents (customer_external_id);
CREATE INDEX IF NOT EXISTS idx_documents_profile           ON documents (profile_id);
CREATE INDEX IF NOT EXISTS idx_documents_type              ON documents (doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_date              ON documents (doc_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tenant            ON documents (tenant_id);

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE documents IS 'Документи з 1С: реалізації, повернення, рахунки. items = JSONB масив рядків.';


-- ================================================================
--  7. PAYMENTS — Оплати
-- ================================================================

CREATE TABLE IF NOT EXISTS payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  order_id        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  profile_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  amount          DECIMAL(12,2) NOT NULL,
  method          TEXT        NOT NULL,                             -- liqpay, cash, bank_transfer, etc.
  transaction_id  TEXT,                                             -- ID транзакції від платіжної системи
  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  paid_at         TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ,                                     -- коли 1С забрав
  metadata        JSONB       DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order     ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_profile   ON payments (profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant    ON payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_synced    ON payments (synced_at);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE payments IS 'Оплати замовлень. synced_at = null означає нова оплата для 1С.';


-- ================================================================
--  8. BONUSES — Бонусні операції
-- ================================================================

CREATE TABLE IF NOT EXISTS bonuses (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  profile_id            UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  customer_external_id  TEXT,                                      -- UUID клієнта в 1С
  order_id              UUID        REFERENCES orders(id) ON DELETE SET NULL,
  type                  TEXT        NOT NULL CHECK (type IN ('accrual', 'redemption')),
  amount                DECIMAL(12,2) NOT NULL,
  reason                TEXT,                                      -- birthday, purchase, manual, etc.
  synced_at             TIMESTAMPTZ,                               -- коли 1С забрав/відправив
  source                TEXT        DEFAULT 'site'                 -- site / 1c
    CHECK (source IN ('site', '1c')),
  metadata              JSONB       DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bonuses_profile    ON bonuses (profile_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_customer   ON bonuses (customer_external_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_tenant     ON bonuses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_type       ON bonuses (type);
CREATE INDEX IF NOT EXISTS idx_bonuses_synced     ON bonuses (synced_at);
CREATE INDEX IF NOT EXISTS idx_bonuses_order      ON bonuses (order_id);

COMMENT ON TABLE bonuses IS 'Бонусні операції: нарахування (accrual) та списання (redemption). source = звідки операція.';


-- ================================================================
--  9. CUSTOMER_PRICES — Індивідуальні B2B ціни
-- ================================================================

CREATE TABLE IF NOT EXISTS customer_prices (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  customer_external_id  TEXT        NOT NULL,
  product_external_id   TEXT        NOT NULL,
  profile_id            UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  product_id            UUID        REFERENCES products(id) ON DELETE SET NULL,
  price                 DECIMAL(12,2) NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_prices_pair
  ON customer_prices (tenant_id, customer_external_id, product_external_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_customer ON customer_prices (customer_external_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_product  ON customer_prices (product_external_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_profile  ON customer_prices (profile_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_tenant   ON customer_prices (tenant_id);

CREATE TRIGGER trg_customer_prices_updated_at
  BEFORE UPDATE ON customer_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE customer_prices IS 'Індивідуальні B2B ціни: зв''язка клієнт + товар → ціна. Завантажуються з 1С.';


-- ================================================================
--  ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE api_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonuses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_prices  ENABLE ROW LEVEL SECURITY;

-- Всі нові таблиці — тільки service_role (адмін).
-- RLS увімкнено, політик немає → доступ тільки через service_role.
-- API Routes використовують createAdminClient().


-- ================================================================
--  КОРИСНІ ФУНКЦІЇ
-- ================================================================

-- Автоматичне видалення старих логів API (> 90 днів)
-- Викликати через Vercel Cron або pg_cron
CREATE OR REPLACE FUNCTION cleanup_api_request_log()
RETURNS void AS $$
BEGIN
  DELETE FROM api_request_log WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_api_request_log IS 'Видалити логи API-запитів старші 90 днів. Запускати через cron.';
