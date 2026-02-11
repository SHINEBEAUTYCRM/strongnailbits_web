-- ================================================================
--  SmartЛійки — воронки продажів для B2B
-- ================================================================

-- Воронки
CREATE TABLE IF NOT EXISTS funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',     -- Колір для UI
  icon TEXT DEFAULT 'Funnel',       -- Lucide icon name
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Системна воронка (не видаляється)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Етапи воронки
CREATE TABLE IF NOT EXISTS funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,  -- Порядок етапу (0 = перший)
  color TEXT,                        -- Колір для UI
  description TEXT,
  -- Автоматичні дії при переході на цей етап
  auto_actions JSONB DEFAULT '[]',   -- [{type: "sms"|"telegram"|"email"|"tag", config: {...}}]
  -- Умови автоматичного переходу НА цей етап
  auto_triggers JSONB DEFAULT '[]',  -- [{event: "order_placed"|"register"|"otp_verified", conditions: {...}}]
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(funnel_id, slug),
  UNIQUE(funnel_id, position)
);

-- Контакти у воронках (хто на якому етапі)
CREATE TABLE IF NOT EXISTS funnel_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES funnel_stages(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone TEXT,                        -- Для неавторизованих
  name TEXT,
  email TEXT,
  metadata JSONB DEFAULT '{}',       -- Додаткові дані (source, utm, etc.)
  entered_funnel_at TIMESTAMPTZ DEFAULT now(),
  entered_stage_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ,          -- Коли пройшов останній етап
  is_active BOOLEAN DEFAULT true,    -- false = вийшов з воронки
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Історія переходів по етапах
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES funnel_contacts(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL,
  to_stage_id UUID NOT NULL REFERENCES funnel_stages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,          -- "auto"|"manual"|"trigger"|"api"
  event_trigger TEXT,                -- Що викликало перехід (order_placed, register, etc.)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_funnel_contacts_funnel ON funnel_contacts(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_contacts_stage ON funnel_contacts(stage_id);
CREATE INDEX IF NOT EXISTS idx_funnel_contacts_profile ON funnel_contacts(profile_id);
CREATE INDEX IF NOT EXISTS idx_funnel_contacts_phone ON funnel_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel ON funnel_events(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_contact ON funnel_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_funnel ON funnel_stages(funnel_id);

-- RLS
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;

-- Тригер updated_at
CREATE OR REPLACE TRIGGER funnels_updated_at
  BEFORE UPDATE ON funnels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER funnel_contacts_updated_at
  BEFORE UPDATE ON funnel_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
--  Шаблонні воронки (автостворення)
-- ================================================================

-- 1. Воронка реєстрації
INSERT INTO funnels (name, slug, description, color, icon, is_default)
VALUES ('Реєстрація клієнта', 'registration', 'Відвідувач → Реєстрація → Перше замовлення', '#6366f1', 'UserPlus', true)
ON CONFLICT (slug) DO NOTHING;

-- Етапи воронки реєстрації
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Відвідувач', 'visitor', 0, '#94a3b8',
  '[{"event": "page_visit", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'registration'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Ввів телефон', 'phone_entered', 1, '#f59e0b',
  '[{"event": "otp_sent", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'registration'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Верифікований', 'verified', 2, '#3b82f6',
  '[{"event": "otp_verified", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'registration'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Зареєстрований', 'registered', 3, '#10b981',
  '[{"event": "register", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'registration'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Перше замовлення', 'first_order', 4, '#8b5cf6',
  '[{"event": "order_placed", "conditions": {"is_first": true}}]'::jsonb
FROM funnels WHERE slug = 'registration'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- 2. Воронка продажів
INSERT INTO funnels (name, slug, description, color, icon, is_default)
VALUES ('Воронка продажів', 'sales', 'Лід → Замовлення → Повторна покупка', '#f59e0b', 'ShoppingBag', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Новий лід', 'new_lead', 0, '#94a3b8',
  '[{"event": "register", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'sales'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Переглядає каталог', 'browsing', 1, '#f59e0b',
  '[{"event": "catalog_view", "conditions": {"min_views": 3}}]'::jsonb
FROM funnels WHERE slug = 'sales'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Додав у кошик', 'cart', 2, '#3b82f6',
  '[{"event": "add_to_cart", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'sales'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Оформив замовлення', 'ordered', 3, '#10b981',
  '[{"event": "order_placed", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'sales'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Повторна покупка', 'repeat', 4, '#8b5cf6',
  '[{"event": "order_placed", "conditions": {"order_count_gte": 2}}]'::jsonb
FROM funnels WHERE slug = 'sales'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- 3. Воронка B2B лояльності
INSERT INTO funnels (name, slug, description, color, icon, is_default)
VALUES ('B2B Лояльність', 'b2b-loyalty', 'Клієнт → Бронза → Срібло → Золото → VIP', '#f97316', 'Crown', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Новий клієнт', 'new', 0, '#94a3b8',
  '[{"event": "register", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'b2b-loyalty'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Бронза', 'bronze', 1, '#cd7f32',
  '[{"event": "loyalty_tier_change", "conditions": {"tier": "bronze"}}]'::jsonb
FROM funnels WHERE slug = 'b2b-loyalty'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Срібло', 'silver', 2, '#c0c0c0',
  '[{"event": "loyalty_tier_change", "conditions": {"tier": "silver"}}]'::jsonb
FROM funnels WHERE slug = 'b2b-loyalty'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Золото', 'gold', 3, '#ffd700',
  '[{"event": "loyalty_tier_change", "conditions": {"tier": "gold"}}]'::jsonb
FROM funnels WHERE slug = 'b2b-loyalty'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'VIP', 'vip', 4, '#8b5cf6',
  '[{"event": "loyalty_tier_change", "conditions": {"tier": "vip"}}]'::jsonb
FROM funnels WHERE slug = 'b2b-loyalty'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- 4. Воронка реактивації
INSERT INTO funnels (name, slug, description, color, icon, is_default)
VALUES ('Реактивація', 'reactivation', 'Неактивний → SMS → Повернувся → Купив', '#ef4444', 'UserCheck', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Неактивний 30+ днів', 'inactive', 0, '#ef4444',
  '[{"event": "cron_inactive_check", "conditions": {"days_since_order": 30}}]'::jsonb
FROM funnels WHERE slug = 'reactivation'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers, auto_actions)
SELECT id, 'Відправлено SMS', 'sms_sent', 1, '#f59e0b',
  '[]'::jsonb,
  '[{"type": "sms", "config": {"template": "reactivation"}}]'::jsonb
FROM funnels WHERE slug = 'reactivation'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Повернувся на сайт', 'returned', 2, '#3b82f6',
  '[{"event": "page_visit", "conditions": {"after_sms": true}}]'::jsonb
FROM funnels WHERE slug = 'reactivation'
ON CONFLICT (funnel_id, slug) DO NOTHING;

INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Зробив замовлення', 'reactivated', 3, '#10b981',
  '[{"event": "order_placed", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'reactivation'
ON CONFLICT (funnel_id, slug) DO NOTHING;
