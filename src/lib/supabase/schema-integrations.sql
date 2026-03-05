-- ================================================================
--  StrongNailBits OS — Integration Infrastructure Schema
--  Supabase / PostgreSQL
--  Розширення для маркетингової екосистеми (47 сервісів)
-- ================================================================


-- ================================================================
--  8. TENANT_SETTINGS
--  Глобальні налаштування тенанта (для White-label; один рядок поки що)
-- ================================================================

CREATE TABLE IF NOT EXISTS tenant_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL DEFAULT 'Strong Nail Bits',
  domain      TEXT,
  logo_url    TEXT,
  theme       JSONB       DEFAULT '{}'::jsonb,
  settings    JSONB       DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Один тенант за замовчуванням
INSERT INTO tenant_settings (name, domain)
VALUES ('Strong Nail Bits', 'strongnailbitsb2b.com')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE tenant_settings IS 'Налаштування тенанта (White-label OS). Один рядок для Strong Nail Bits, більше для мультитенанта.';


-- ================================================================
--  9. INTEGRATION_KEYS
--  API-ключі для всіх 47 сервісів (шифровані JSONB)
-- ================================================================

CREATE TABLE IF NOT EXISTS integration_keys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  service_slug  TEXT        NOT NULL,
  config        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN     DEFAULT false,
  is_verified   BOOLEAN     DEFAULT false,
  verified_at   TIMESTAMPTZ,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (tenant_id, service_slug)
);

CREATE INDEX IF NOT EXISTS idx_integration_keys_tenant    ON integration_keys (tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_keys_slug      ON integration_keys (service_slug);
CREATE INDEX IF NOT EXISTS idx_integration_keys_active    ON integration_keys (is_active);

CREATE TRIGGER trg_integration_keys_updated_at
  BEFORE UPDATE ON integration_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE integration_keys IS 'API-ключі інтеграцій. config містить зашифровані ключі (JSONB). Унікальний по (tenant_id, service_slug).';


-- ================================================================
--  10. INTEGRATION_LOGS
--  Логи виконання інтеграцій
-- ================================================================

CREATE TABLE IF NOT EXISTS integration_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  service_slug  TEXT        NOT NULL,
  action        TEXT        NOT NULL,
  status        TEXT        NOT NULL CHECK (status IN ('success', 'error', 'warning', 'info')),
  message       TEXT,
  metadata      JSONB       DEFAULT '{}'::jsonb,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_tenant    ON integration_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_slug      ON integration_logs (service_slug);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status    ON integration_logs (status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created   ON integration_logs (created_at DESC);

-- Авто-видалення логів старших за 30 днів (через cron)
COMMENT ON TABLE integration_logs IS 'Логи виконання інтеграцій. Зберігаються 30 днів.';


-- ================================================================
--  11. CRON_JOBS
--  Реєстр запланованих задач (Vercel Cron)
-- ================================================================

CREATE TABLE IF NOT EXISTS cron_jobs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  slug          TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  description   TEXT,
  schedule      TEXT        NOT NULL,
  api_route     TEXT        NOT NULL,
  is_active     BOOLEAN     DEFAULT true,
  last_run_at   TIMESTAMPTZ,
  last_status   TEXT,
  last_duration_ms INTEGER,
  next_run_at   TIMESTAMPTZ,
  run_count     INTEGER     DEFAULT 0,
  error_count   INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_cron_jobs_tenant   ON cron_jobs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_active   ON cron_jobs (is_active);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_schedule ON cron_jobs (schedule);

CREATE TRIGGER trg_cron_jobs_updated_at
  BEFORE UPDATE ON cron_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE cron_jobs IS 'Реєстр запланованих задач. schedule = cron-вираз. Vercel Cron викликає відповідний API Route.';


-- ================================================================
--  12. AUTOMATION_TRIGGERS
--  Реєстр DB-тригерів для автоматизації
-- ================================================================

CREATE TABLE IF NOT EXISTS automation_triggers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenant_settings(id) ON DELETE CASCADE,
  slug          TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  description   TEXT,
  table_name    TEXT        NOT NULL,
  event         TEXT        NOT NULL CHECK (event IN ('INSERT', 'UPDATE', 'DELETE')),
  conditions    JSONB       DEFAULT '{}'::jsonb,
  action_route  TEXT        NOT NULL,
  is_active     BOOLEAN     DEFAULT true,
  last_fired_at TIMESTAMPTZ,
  fire_count    INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_automation_triggers_tenant ON automation_triggers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_table  ON automation_triggers (table_name);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_active ON automation_triggers (is_active);

CREATE TRIGGER trg_automation_triggers_updated_at
  BEFORE UPDATE ON automation_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE automation_triggers IS 'Реєстр автоматизацій на базі DB-подій. conditions = JSONB фільтр полів.';


-- ================================================================
--  ROW LEVEL SECURITY для нових таблиць
-- ================================================================

ALTER TABLE tenant_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_keys    ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_triggers ENABLE ROW LEVEL SECURITY;

-- Всі нові таблиці — тільки service_role (адмін).
-- RLS увімкнено, політик немає → доступ тільки через service_role
-- який обходить RLS за замовчуванням.
-- Це безпечно: API Routes використовують createAdminClient().
