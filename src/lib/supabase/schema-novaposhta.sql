-- ══════════════════════════════════════════════════════════
-- Nova Poshta — Supabase Schema (V2)
-- 
-- Cities: старе API v2.0 getCities
-- Warehouses: НОВЕ API v1.0 /divisions (np_id замість ref!)
-- ══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ════════════════════════════════════════
--  МІСТА (~1 100 записів)
--  Джерело: старе API v2.0 getCities
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS np_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT UNIQUE NOT NULL,
  name_ua TEXT NOT NULL,
  name_ru TEXT NOT NULL DEFAULT '',
  area_ua TEXT NOT NULL DEFAULT '',
  area_ru TEXT NOT NULL DEFAULT '',
  settlement_type TEXT DEFAULT 'місто',
  city_id TEXT DEFAULT '',
  has_delivery BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_np_cities_name_ua_trgm ON np_cities USING gin (name_ua gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_np_cities_name_ru_trgm ON np_cities USING gin (name_ru gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_np_cities_ref ON np_cities (ref);

-- ════════════════════════════════════════
--  ВІДДІЛЕННЯ / ПОШТОМАТИ (~25 000+ записів)
--  Джерело: НОВЕ API v1.0 /divisions
-- ════════════════════════════════════════
DROP TABLE IF EXISTS np_warehouses CASCADE;

CREATE TABLE np_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  np_id INTEGER UNIQUE NOT NULL,
  city_name TEXT NOT NULL DEFAULT '',
  settlement_id INTEGER,
  name_ua TEXT NOT NULL,
  short_name TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  address TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'branch',
  status TEXT DEFAULT 'Working',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  schedule JSONB DEFAULT '[]',
  country_code TEXT DEFAULT 'UA',
  region_name TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_np_warehouses_city ON np_warehouses (city_name);
CREATE INDEX idx_np_warehouses_settlement ON np_warehouses (settlement_id);
CREATE INDEX idx_np_warehouses_category ON np_warehouses (category);
CREATE INDEX idx_np_warehouses_active ON np_warehouses (is_active) WHERE is_active = true;
CREATE INDEX idx_np_warehouses_name_trgm ON np_warehouses USING gin (name_ua gin_trgm_ops);
CREATE INDEX idx_np_warehouses_city_trgm ON np_warehouses USING gin (city_name gin_trgm_ops);
CREATE INDEX idx_np_warehouses_np_id ON np_warehouses (np_id);

-- ════════════════════════════════════════
--  ЛОГ СИНХРОНІЗАЦІЇ
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS np_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  status TEXT NOT NULL,
  total_count INTEGER DEFAULT 0,
  upserted INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════
--  RLS
-- ════════════════════════════════════════
ALTER TABLE np_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE np_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE np_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "np_cities_read" ON np_cities FOR SELECT USING (true);
CREATE POLICY "np_warehouses_read" ON np_warehouses FOR SELECT USING (true);
CREATE POLICY "np_cities_write" ON np_cities FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "np_warehouses_write" ON np_warehouses FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "np_sync_log_all" ON np_sync_log FOR ALL USING (false) WITH CHECK (false);

-- ════════════════════════════════════════
--  Функція пошуку міст з ранжуванням
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_np_cities(
  query TEXT,
  max_results INTEGER DEFAULT 15
)
RETURNS TABLE (
  ref TEXT, name_ua TEXT, name_ru TEXT, area_ua TEXT, settlement_type TEXT, rank REAL
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.ref, c.name_ua, c.name_ru, c.area_ua, c.settlement_type,
    CASE
      WHEN lower(c.name_ua) = lower(query) THEN 1.0
      WHEN lower(c.name_ru) = lower(query) THEN 1.0
      WHEN lower(c.name_ua) LIKE lower(query) || '%' THEN 0.9
      WHEN lower(c.name_ru) LIKE lower(query) || '%' THEN 0.85
      WHEN c.name_ua ILIKE '%' || query || '%' THEN 0.7
      ELSE 0.5
    END::REAL AS rank
  FROM np_cities c
  WHERE c.has_delivery = true
    AND (c.name_ua ILIKE query || '%' OR c.name_ru ILIKE query || '%'
         OR c.name_ua ILIKE '%' || query || '%')
  ORDER BY rank DESC, c.name_ua ASC
  LIMIT max_results;
END; $$;

-- ════════════════════════════════════════
--  Функція пошуку відділень по місту
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_np_warehouses(
  city TEXT,
  category_filter TEXT DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  max_results INTEGER DEFAULT 200
)
RETURNS TABLE (
  np_id INTEGER, name_ua TEXT, short_name TEXT, number TEXT,
  address TEXT, category TEXT, latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION, schedule JSONB, status TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT w.np_id, w.name_ua, w.short_name, w.number,
         w.address, w.category, w.latitude, w.longitude,
         w.schedule, w.status
  FROM np_warehouses w
  WHERE w.is_active = true
    AND w.country_code = 'UA'
    AND lower(w.city_name) = lower(city)
    AND (category_filter IS NULL OR w.category = category_filter)
    AND (search_query IS NULL
         OR w.name_ua ILIKE '%' || search_query || '%'
         OR w.number = search_query)
  ORDER BY
    CASE WHEN w.number ~ '^\d+$' THEN w.number::INTEGER ELSE 99999 END ASC,
    w.name_ua ASC
  LIMIT max_results;
END; $$;

-- Автооновлення updated_at
CREATE OR REPLACE FUNCTION update_np_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_np_cities_updated ON np_cities;
DROP TRIGGER IF EXISTS trg_np_warehouses_updated ON np_warehouses;
CREATE TRIGGER trg_np_cities_updated BEFORE UPDATE ON np_cities FOR EACH ROW EXECUTE FUNCTION update_np_updated_at();
CREATE TRIGGER trg_np_warehouses_updated BEFORE UPDATE ON np_warehouses FOR EACH ROW EXECUTE FUNCTION update_np_updated_at();

-- Колонки трекінгу для orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_status_text TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_estimated_delivery TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_actual_delivery TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_last_checked TIMESTAMPTZ;
