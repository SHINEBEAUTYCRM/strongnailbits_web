-- ═══════════════════════════════════════════════════════
--  Nova Poshta — Supabase tables for cached NP data
--  Run in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- Trigram extension for fast text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ════════════════════════════════════════
--  Table 1: CITIES (~1 100 records)
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
--  Table 2: WAREHOUSES (~25 000+ records)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS np_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT UNIQUE NOT NULL,
  city_ref TEXT NOT NULL REFERENCES np_cities(ref),
  name_ua TEXT NOT NULL,
  name_ru TEXT NOT NULL DEFAULT '',
  short_address_ua TEXT DEFAULT '',
  short_address_ru TEXT DEFAULT '',
  number INTEGER DEFAULT 0,
  type_ref TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'branch',  -- 'branch' | 'postomat' | 'cargo'
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT DEFAULT '',
  schedule JSONB DEFAULT '{}',
  max_weight NUMERIC DEFAULT 30,
  has_pos BOOLEAN DEFAULT false,
  has_postfinance BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_np_warehouses_city ON np_warehouses (city_ref);
CREATE INDEX IF NOT EXISTS idx_np_warehouses_category ON np_warehouses (category);
CREATE INDEX IF NOT EXISTS idx_np_warehouses_active ON np_warehouses (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_np_warehouses_number ON np_warehouses (city_ref, number);
CREATE INDEX IF NOT EXISTS idx_np_warehouses_name_trgm ON np_warehouses USING gin (name_ua gin_trgm_ops);

-- ════════════════════════════════════════
--  Table 3: WAREHOUSE TYPES (3-5 records)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS np_warehouse_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT UNIQUE NOT NULL,
  description_ua TEXT NOT NULL,
  description_ru TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════
--  Table 4: SYNC LOG
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
--  RLS (Row Level Security)
-- ════════════════════════════════════════
ALTER TABLE np_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE np_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE np_warehouse_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE np_sync_log ENABLE ROW LEVEL SECURITY;

-- READ: allowed for everyone (customers search cities/warehouses)
CREATE POLICY "np_cities_read" ON np_cities FOR SELECT USING (true);
CREATE POLICY "np_warehouses_read" ON np_warehouses FOR SELECT USING (true);
CREATE POLICY "np_warehouse_types_read" ON np_warehouse_types FOR SELECT USING (true);

-- WRITE: blocked for anon/authenticated (service_role bypasses RLS)
CREATE POLICY "np_cities_write" ON np_cities FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "np_warehouses_write" ON np_warehouses FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "np_sync_log_all" ON np_sync_log FOR ALL USING (false) WITH CHECK (false);

-- ════════════════════════════════════════
--  City search function with ranking
--  Exact match "Одеса" ranks higher than "Одеське"
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_np_cities(
  query TEXT,
  max_results INTEGER DEFAULT 15
)
RETURNS TABLE (
  ref TEXT,
  name_ua TEXT,
  name_ru TEXT,
  area_ua TEXT,
  settlement_type TEXT,
  rank REAL
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.ref, c.name_ua, c.name_ru, c.area_ua, c.settlement_type,
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
--  Auto-update updated_at trigger
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_np_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_np_cities_updated BEFORE UPDATE ON np_cities FOR EACH ROW EXECUTE FUNCTION update_np_updated_at();
CREATE TRIGGER trg_np_warehouses_updated BEFORE UPDATE ON np_warehouses FOR EACH ROW EXECUTE FUNCTION update_np_updated_at();

-- ════════════════════════════════════════
--  Orders table: add NP tracking columns
-- ════════════════════════════════════════
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_status_text TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_estimated_delivery TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_actual_delivery TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS np_last_checked TIMESTAMPTZ;
