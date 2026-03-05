-- ================================================================
--  Strong Nail Bits B2B — Enrichment Pipeline Schema
--  pgvector + brands extension + products enrichment + enrichment_log
-- ================================================================

-- 1. Включить pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
--  2. РАСШИРЕНИЕ BRANDS
-- ================================================================

-- Источники для парсинга
ALTER TABLE brands ADD COLUMN IF NOT EXISTS photo_source_url TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS photo_source_type TEXT DEFAULT 'website';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS info_source_url TEXT;

-- Настройки парсера (JSONB)
-- {
--   "product_url_pattern": "dark.ua/product/{article}",
--   "search_url_pattern": "dark.ua/search?q={article}",
--   "selectors": {
--     "title": ".product-title",
--     "description": ".product-description",
--     "photo": ".product-gallery img",
--     "specs": ".product-specs table",
--     "composition": ".product-composition",
--     "instructions": ".product-instructions"
--   },
--   "parse_options": {
--     "photos": true, "description": true, "specs": true,
--     "composition": true, "instructions": true, "palette": true, "price_rrp": false
--   },
--   "auto_detected": true,
--   "detection_date": "2026-02-14T12:00:00Z"
-- }
ALTER TABLE brands ADD COLUMN IF NOT EXISTS parse_config JSONB DEFAULT '{}';

-- Знания о бренде (для AI enrichment)
ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_knowledge JSONB DEFAULT '{}';

-- Статистика
ALTER TABLE brands ADD COLUMN IF NOT EXISTS total_products INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS products_with_photo INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS products_enriched INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS products_approved INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS last_parsed_at TIMESTAMPTZ;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS supplier_contact TEXT;

-- ================================================================
--  3. РАСШИРЕНИЕ PRODUCTS
-- ================================================================

-- Enrichment статус и источник
ALTER TABLE products ADD COLUMN IF NOT EXISTS enrichment_source TEXT DEFAULT 'cs_cart';
ALTER TABLE products ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';
ALTER TABLE products ADD COLUMN IF NOT EXISTS enrichment_date TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS enriched_by TEXT;

-- AI данные (каждое поле с source)
-- {
--   "description_uk": {
--     "value": "Гель-лак DARK №028 — насичений бордовий...",
--     "source": "ai",
--     "edited": false,
--     "original_text": "Dark gel polish 028 — rich burgundy...",
--     "original_source": "dark.ua/product/gel-polish-028"
--   },
--   "color_family": { "value": "бордо", "source": "parsed", "edited": false },
--   "color_hex": { "value": "#6B1C2A", "source": "vision", "edited": false },
--   ...
-- }
ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}';

-- Сырые данные парсера
ALTER TABLE products ADD COLUMN IF NOT EXISTS raw_parsed_data JSONB DEFAULT '{}';

-- Источник каждого фото
-- [
--   { "url": "/storage/products/dark-028-1.jpg", "source": "parsed", "from": "dark.ua", "type": "bottle" },
--   { "url": "https://strongnailbits.com.ua/images/detailed/...", "source": "cs_cart", "type": "main" }
-- ]
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_sources JSONB DEFAULT '[]';

-- Вектор для AI-поиска (1024 dimensions for Voyage AI voyage-3-lite)
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_products_enrichment_status ON products(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ================================================================
--  4. ENRICHMENT_LOG
-- ================================================================

CREATE TABLE IF NOT EXISTS enrichment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  product_id UUID REFERENCES products(id),
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_log_brand ON enrichment_log(brand_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_product ON enrichment_log(product_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_created ON enrichment_log(created_at DESC);

-- RLS
ALTER TABLE enrichment_log ENABLE ROW LEVEL SECURITY;
-- Нет публичных политик — доступ только через service_role

-- ================================================================
--  Комментарии
-- ================================================================
COMMENT ON TABLE enrichment_log IS 'Лог операций AI Enrichment Pipeline';
COMMENT ON COLUMN products.ai_metadata IS 'AI-обогащённые данные (описание, цвет, теги) с указанием source';
COMMENT ON COLUMN products.raw_parsed_data IS 'Сырые данные парсера (title, description, specs, photos)';
COMMENT ON COLUMN products.photo_sources IS 'Массив фото с указанием источника (parsed/cs_cart/manual)';
COMMENT ON COLUMN products.embedding IS 'Вектор для AI-поиска (Voyage AI voyage-3-lite, 1024 dims)';
COMMENT ON COLUMN brands.parse_config IS 'Настройки парсера: URL-паттерны, CSS-селекторы, опции';
COMMENT ON COLUMN brands.brand_knowledge IS 'Знания о бренде для AI enrichment';
