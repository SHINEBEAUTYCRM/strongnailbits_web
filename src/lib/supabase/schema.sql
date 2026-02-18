-- ================================================================
--  Shine Shop B2B — Database Schema
--  Supabase / PostgreSQL
-- ================================================================

-- ----------------------------------------------------------------
--  Функція автооновлення updated_at
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
--  1. CATEGORIES
-- ================================================================

CREATE TABLE IF NOT EXISTS categories (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cs_cart_id        INTEGER     UNIQUE NOT NULL,
  parent_cs_cart_id INTEGER,
  name_uk           TEXT        NOT NULL,
  name_ru           TEXT,
  slug              TEXT        UNIQUE NOT NULL,
  description_uk    TEXT,
  description_ru    TEXT,
  image_url         TEXT,
  position          INTEGER     DEFAULT 0,
  status            TEXT        DEFAULT 'active',
  product_count     INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug              ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_cs_cart_id        ON categories (cs_cart_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_cs_cart_id ON categories (parent_cs_cart_id);
CREATE INDEX IF NOT EXISTS idx_categories_status            ON categories (status);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
--  2. BRANDS
-- ================================================================

CREATE TABLE IF NOT EXISTS brands (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  cs_cart_id      INTEGER UNIQUE,
  name            TEXT    UNIQUE NOT NULL,
  slug            TEXT    UNIQUE NOT NULL,
  logo_url        TEXT,
  description_uk  TEXT,
  description_ru  TEXT,
  country         TEXT,
  is_featured     BOOLEAN     DEFAULT false,
  position        INTEGER     DEFAULT 0,
  source_urls     TEXT[]      DEFAULT '{}',
  source_notes    TEXT        DEFAULT '',
  ai_prompt_context TEXT     DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands (slug);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands (name);

CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
--  3. PRODUCTS
-- ================================================================

CREATE TABLE IF NOT EXISTS products (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  cs_cart_id          INTEGER        UNIQUE NOT NULL,
  category_id         UUID           REFERENCES categories(id),
  brand_id            UUID           REFERENCES brands(id),
  name_uk             TEXT           NOT NULL,
  name_ru             TEXT,
  slug                TEXT           UNIQUE NOT NULL,
  sku                 TEXT,
  description_uk      TEXT,
  description_ru      TEXT,
  price               DECIMAL(10,2)  NOT NULL,
  wholesale_price     DECIMAL(10,2),
  old_price           DECIMAL(10,2),
  cost_price          DECIMAL(10,2),
  quantity            INTEGER        DEFAULT 0,
  status              TEXT           DEFAULT 'active',
  images              JSONB          DEFAULT '[]'::jsonb,
  main_image_url      TEXT,
  weight              DECIMAL(8,3),
  properties          JSONB          DEFAULT '{}'::jsonb,
  meta_title          TEXT,
  meta_description    TEXT,
  is_featured         BOOLEAN        DEFAULT false,
  is_new              BOOLEAN        DEFAULT false,
  position            INTEGER        DEFAULT 0,
  cs_cart_updated_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ    DEFAULT now(),
  updated_at          TIMESTAMPTZ    DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_slug        ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_cs_cart_id  ON products (cs_cart_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id    ON products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_status      ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_sku         ON products (sku);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
--  4. PROFILES
-- ================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID           PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cs_cart_id            INTEGER        UNIQUE,
  email                 TEXT           UNIQUE NOT NULL,
  phone                 TEXT,
  first_name            TEXT,
  last_name             TEXT,
  company               TEXT,
  type                  TEXT           DEFAULT 'retail',
  discount_percent      DECIMAL(5,2)   DEFAULT 0,
  price_group           TEXT,
  nova_poshta_city      TEXT,
  nova_poshta_warehouse TEXT,
  delivery_address      TEXT,
  is_active             BOOLEAN        DEFAULT true,
  total_orders          INTEGER        DEFAULT 0,
  total_spent           DECIMAL(12,2)  DEFAULT 0,
  created_at            TIMESTAMPTZ    DEFAULT now(),
  updated_at            TIMESTAMPTZ    DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_cs_cart_id ON profiles (cs_cart_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email      ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_type       ON profiles (type);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
--  5. ORDERS
-- ================================================================

CREATE TABLE IF NOT EXISTS orders (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  cs_cart_id       INTEGER        UNIQUE,
  order_number     TEXT           UNIQUE NOT NULL,
  profile_id       UUID           REFERENCES profiles(id),
  status           TEXT           DEFAULT 'new',
  payment_status   TEXT           DEFAULT 'pending',
  items            JSONB          NOT NULL,
  subtotal         DECIMAL(10,2)  NOT NULL,
  discount         DECIMAL(10,2)  DEFAULT 0,
  shipping_cost    DECIMAL(10,2)  DEFAULT 0,
  total            DECIMAL(10,2)  NOT NULL,
  payment_method   TEXT,
  shipping_method  TEXT,
  shipping_address JSONB,
  ttn              TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ    DEFAULT now(),
  updated_at       TIMESTAMPTZ    DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_cs_cart_id    ON orders (cs_cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_profile_id    ON orders (profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number  ON orders (order_number);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
--  6. CARTS
-- ================================================================

CREATE TABLE IF NOT EXISTS carts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        UNIQUE REFERENCES profiles(id),
  session_id  TEXT        UNIQUE,
  items       JSONB       DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
--  7. SYNC_LOG
-- ================================================================

CREATE TABLE IF NOT EXISTS sync_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity          TEXT        NOT NULL,
  action          TEXT        NOT NULL,
  status          TEXT        NOT NULL,
  items_processed INTEGER     DEFAULT 0,
  items_created   INTEGER     DEFAULT 0,
  items_updated   INTEGER     DEFAULT 0,
  items_failed    INTEGER     DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_log_entity     ON sync_log (entity);
CREATE INDEX IF NOT EXISTS idx_sync_log_status     ON sync_log (status);
CREATE INDEX IF NOT EXISTS idx_sync_log_started_at ON sync_log (started_at);


-- ================================================================
--  ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Увімкнути RLS на всіх таблицях
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log   ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
--  categories: SELECT для всіх (anon + authenticated)
-- ----------------------------------------------------------------
CREATE POLICY "categories_select_public"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- ----------------------------------------------------------------
--  brands: SELECT для всіх (anon + authenticated)
-- ----------------------------------------------------------------
CREATE POLICY "brands_select_public"
  ON brands FOR SELECT
  TO anon, authenticated
  USING (true);

-- ----------------------------------------------------------------
--  products: SELECT для всіх (anon + authenticated)
-- ----------------------------------------------------------------
CREATE POLICY "products_select_public"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

-- ----------------------------------------------------------------
--  profiles: SELECT/UPDATE тільки свій профіль
-- ----------------------------------------------------------------
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------
--  orders: SELECT тільки свої замовлення
-- ----------------------------------------------------------------
CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- ----------------------------------------------------------------
--  carts: повний доступ тільки до свого кошика
-- ----------------------------------------------------------------
CREATE POLICY "carts_select_own"
  ON carts FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "carts_insert_own"
  ON carts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "carts_update_own"
  ON carts FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "carts_delete_own"
  ON carts FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- ----------------------------------------------------------------
--  sync_log: ніякого публічного доступу (тільки service_role)
-- ----------------------------------------------------------------
-- RLS увімкнено, політик немає → доступ тільки через service_role
-- який обходить RLS за замовчуванням.


-- ================================================================
--  Коментарі до таблиць
-- ================================================================

COMMENT ON TABLE categories IS 'Категорії товарів (синхронізація з CS-Cart)';
COMMENT ON TABLE brands     IS 'Бренди / виробники';
COMMENT ON TABLE products   IS 'Товари (синхронізація з CS-Cart). Ціни в UAH (₴)';
COMMENT ON TABLE profiles   IS 'Профілі користувачів B2B (retail/wholesale)';
COMMENT ON TABLE orders     IS 'Замовлення. Статуси: new/processing/shipped/delivered/cancelled';
COMMENT ON TABLE carts      IS 'Кошики користувачів (один кошик на профіль або сесію)';
COMMENT ON TABLE sync_log   IS 'Лог синхронізації з CS-Cart API';
