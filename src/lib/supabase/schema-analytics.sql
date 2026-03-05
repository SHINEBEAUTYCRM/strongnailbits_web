-- ================================================================
--  StrongNailBits OS — Site Analytics Schema
--  Власна аналітика для реалтайм дашборду в адмінці
-- ================================================================

CREATE TABLE IF NOT EXISTS site_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL,  -- page_view, add_to_cart, purchase, search, etc.
  page_path   TEXT,
  page_title  TEXT,
  referrer    TEXT,
  product_id  TEXT,
  product_name TEXT,
  search_query TEXT,
  order_id    TEXT,
  revenue     DECIMAL(12,2),
  session_id  TEXT,
  user_agent  TEXT,
  ip_hash     TEXT,                  -- SHA-256 хеш IP (не зберігаємо IP)
  country     TEXT,
  device_type TEXT,                  -- desktop, mobile, tablet
  metadata    JSONB       DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Індекси для швидких запитів дашборду
CREATE INDEX IF NOT EXISTS idx_site_events_type      ON site_events (event_type);
CREATE INDEX IF NOT EXISTS idx_site_events_created   ON site_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_events_page      ON site_events (page_path);
CREATE INDEX IF NOT EXISTS idx_site_events_session   ON site_events (session_id);
CREATE INDEX IF NOT EXISTS idx_site_events_type_date ON site_events (event_type, created_at DESC);

-- RLS: тільки service_role
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;

-- Авто-видалення старих подій (зберігаємо 90 днів)
COMMENT ON TABLE site_events IS 'Аналітичні події сайту для реалтайм дашборду. Зберігаються 90 днів.';
