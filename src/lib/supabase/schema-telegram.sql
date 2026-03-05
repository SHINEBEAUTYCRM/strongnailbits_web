-- ================================================================
--  Strong Nail Bits Telegram Bot — Database Schema
--  Admin users, link codes, notification settings, sessions
-- ================================================================

-- ════════════════════════════════════════
--  1. ADMIN USERS (визначає хто адмін у Telegram боті)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_id   BIGINT      UNIQUE NOT NULL,
  role          TEXT        DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'manager')),
  permissions   JSONB       DEFAULT '["orders","products","analytics","chat"]',
  is_active     BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_telegram ON admin_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_profile  ON admin_users(profile_id);

CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE admin_users IS 'Адміністратори Telegram бота (owner/admin/manager)';

-- ════════════════════════════════════════
--  2. TELEGRAM LINK CODES (одноразові коди для прив'язки)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id   BIGINT      NOT NULL,
  code          TEXT        NOT NULL,
  used          BOOLEAN     DEFAULT false,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_codes_code     ON telegram_link_codes(code) WHERE NOT used;
CREATE INDEX IF NOT EXISTS idx_link_codes_telegram ON telegram_link_codes(telegram_id);

COMMENT ON TABLE telegram_link_codes IS 'Одноразові коди для прив''язки Telegram до акаунту';

-- ════════════════════════════════════════
--  3. ADMIN NOTIFICATION SETTINGS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_notification_settings (
  admin_id                UUID    PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
  new_orders              BOOLEAN DEFAULT true,
  large_orders_threshold  NUMERIC DEFAULT 5000,
  stock_critical          BOOLEAN DEFAULT true,
  client_requests         BOOLEAN DEFAULT true,
  negative_reviews        BOOLEAN DEFAULT true,
  daily_report            BOOLEAN DEFAULT true,
  daily_report_time       TIME    DEFAULT '20:00',
  weekly_report           BOOLEAN DEFAULT true,
  weekly_report_day       INTEGER DEFAULT 1,  -- 1 = Monday
  quiet_hours_start       TIME    DEFAULT '23:00',
  quiet_hours_end         TIME    DEFAULT '08:00',
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_admin_notif_updated_at
  BEFORE UPDATE ON admin_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE admin_notification_settings IS 'Налаштування сповіщень для кожного адміна';

-- ════════════════════════════════════════
--  4. TELEGRAM SESSIONS (збереження контексту розмови)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS telegram_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id     BIGINT      UNIQUE NOT NULL,
  messages        JSONB       DEFAULT '[]',  -- [{role, content}]
  message_count   INTEGER     DEFAULT 0,
  is_admin        BOOLEAN     DEFAULT false,
  profile_id      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  tools_used      TEXT[]      DEFAULT '{}',
  total_input_tokens  INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  last_activity   TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tg_sessions_telegram  ON telegram_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_tg_sessions_activity  ON telegram_sessions(last_activity);

CREATE TRIGGER trg_tg_sessions_updated_at
  BEFORE UPDATE ON telegram_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE telegram_sessions IS 'Збереження контексту розмов Telegram бота';

-- ════════════════════════════════════════
--  5. RLS
-- ════════════════════════════════════════
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;

-- Тільки service_role має доступ (бот працює через admin client)
-- Окремих RLS policies не потрібно — бот використовує service_role key

-- ════════════════════════════════════════
--  6. Ensure telegram columns exist in profiles
-- ════════════════════════════════════════
-- (Already added by schema-messaging.sql, but safe to repeat)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_telegram_unique
  ON profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- ════════════════════════════════════════
--  7. Auto-cleanup expired link codes (optional cron)
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION cleanup_expired_link_codes()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM telegram_link_codes
  WHERE expires_at < now() - INTERVAL '1 hour';
END; $$;
