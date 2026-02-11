-- ================================================================
--  SmartЛійки Messaging — шаблони повідомлень, доставка, логи
-- ================================================================

-- 1. Додаємо Telegram-поля до profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_channel TEXT DEFAULT 'auto';
  -- auto = Telegram якщо є, інакше SMS
  -- telegram = тільки Telegram
  -- sms = тільки SMS
  -- both = і Telegram, і SMS

CREATE INDEX IF NOT EXISTS idx_profiles_telegram ON profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- 2. Шаблони повідомлень для етапів воронки
CREATE TABLE IF NOT EXISTS funnel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES funnel_stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- Назва шаблону для адмінки
  channel TEXT NOT NULL DEFAULT 'auto',  -- auto | telegram | sms
  template TEXT NOT NULL,                -- Текст з {{змінними}}
  delay_minutes INTEGER DEFAULT 0,       -- 0 = одразу, 60 = через годину
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,          -- Порядок виконання
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_messages_stage ON funnel_messages(stage_id);

-- 3. Лог доставки повідомлень
CREATE TABLE IF NOT EXISTS message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  funnel_contact_id UUID REFERENCES funnel_contacts(id) ON DELETE SET NULL,
  funnel_message_id UUID REFERENCES funnel_messages(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,                 -- telegram | sms
  phone TEXT,
  telegram_chat_id BIGINT,
  template TEXT,                         -- Оригінальний шаблон
  rendered_text TEXT,                    -- Фінальний текст
  status TEXT DEFAULT 'sent',            -- sent | delivered | failed | pending
  error TEXT,
  cost DECIMAL(10,4) DEFAULT 0,          -- Вартість (для SMS)
  external_id TEXT,                      -- ID від API (AlphaSMS id, Telegram message_id)
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_log_profile ON message_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_message_log_status ON message_log(status);
CREATE INDEX IF NOT EXISTS idx_message_log_channel ON message_log(channel);
CREATE INDEX IF NOT EXISTS idx_message_log_created ON message_log(created_at DESC);

-- 4. Черга відкладених повідомлень
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_message_id UUID NOT NULL REFERENCES funnel_messages(id) ON DELETE CASCADE,
  funnel_contact_id UUID NOT NULL REFERENCES funnel_contacts(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone TEXT,
  variables JSONB DEFAULT '{}',          -- Збережені змінні для рендерингу
  scheduled_for TIMESTAMPTZ NOT NULL,    -- Коли відправити
  status TEXT DEFAULT 'pending',         -- pending | sent | cancelled | failed
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_pending ON scheduled_messages(scheduled_for)
  WHERE status = 'pending';

-- RLS
ALTER TABLE funnel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Тригер updated_at
CREATE OR REPLACE TRIGGER funnel_messages_updated_at
  BEFORE UPDATE ON funnel_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
--  Шаблонні повідомлення для існуючих воронок
-- ================================================================

-- Реєстрація клієнта — етап "Зареєстрований"
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order)
SELECT f.id, s.id,
  'Вітання з реєстрацією',
  'auto',
  'Вітаємо, {{name}}! 🎉

Ви зареєструвались у ShineShop B2B. Тепер вам доступні:
✅ Оптові ціни
✅ Персональні знижки
✅ Бонусна програма

Перегляньте каталог: {{site_url}}/catalog',
  0, 0
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'registered'
WHERE f.slug = 'registration'
ON CONFLICT DO NOTHING;

-- Реєстрація — нагадування якщо немає замовлення через 24 години
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order)
SELECT f.id, s.id,
  'Нагадування: перше замовлення',
  'auto',
  '{{name}}, ви ще не зробили перше замовлення 🛒

Подивіться наші бестселери та новинки. Для вас вже діє персональна знижка!

👉 {{site_url}}/catalog',
  1440, 1
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'registered'
WHERE f.slug = 'registration'
ON CONFLICT DO NOTHING;

-- Воронка продажів — етап "Оформив замовлення"
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order)
SELECT f.id, s.id,
  'Дякуємо за замовлення',
  'auto',
  '{{name}}, дякуємо за замовлення #{{order_number}}! 📦

Сума: {{order_total}} ₴
Ми вже обробляємо ваше замовлення.

Відстежити статус: {{site_url}}/account/orders',
  0, 0
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'ordered'
WHERE f.slug = 'sales'
ON CONFLICT DO NOTHING;

-- Воронка продажів — етап "Повторна покупка"
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order)
SELECT f.id, s.id,
  'Вітання з повторною покупкою',
  'auto',
  '{{name}}, дякуємо що повернулись! 🙏

Ваше замовлення #{{order_number}} прийнято.
Як постійний клієнт, ви отримуєте додаткові переваги.

Переглянути бонуси: {{site_url}}/account/bonuses',
  0, 0
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'repeat'
WHERE f.slug = 'sales'
ON CONFLICT DO NOTHING;

-- B2B Лояльність — кожен рівень
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order)
SELECT f.id, s.id,
  'Підвищення до Бронзи',
  'auto',
  '🥉 {{name}}, вітаємо!

Ви досягли рівня Бронза у програмі лояльності ShineShop B2B!
Ваші нові переваги вже активні.

Деталі: {{site_url}}/account/bonuses',
  0, 0
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'bronze'
WHERE f.slug = 'b2b-loyalty'
ON CONFLICT DO NOTHING;

INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order)
SELECT f.id, s.id,
  'Підвищення до Срібла',
  'auto',
  '🥈 {{name}}, вітаємо!

Ви досягли рівня Срібло! Тепер ваша знижка ще більша.

Деталі: {{site_url}}/account/bonuses',
  0, 0
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'silver'
WHERE f.slug = 'b2b-loyalty'
ON CONFLICT DO NOTHING;

INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order)
SELECT f.id, s.id,
  'Підвищення до Золота',
  'auto',
  '🥇 {{name}}, вітаємо!

Ви досягли рівня Золото — ексклюзивних умов для найкращих клієнтів!

Деталі: {{site_url}}/account/bonuses',
  0, 0
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'gold'
WHERE f.slug = 'b2b-loyalty'
ON CONFLICT DO NOTHING;

INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order)
SELECT f.id, s.id,
  'VIP статус',
  'auto',
  '👑 {{name}}, вітаємо!

Ви отримали VIP статус — найвищий рівень у ShineShop B2B!
Максимальні знижки, пріоритетна обробка замовлень.

Деталі: {{site_url}}/account/bonuses',
  0, 0
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'vip'
WHERE f.slug = 'b2b-loyalty'
ON CONFLICT DO NOTHING;

-- Реактивація — етап "Неактивний"
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order)
SELECT f.id, s.id,
  'Реактивація: ми сумуємо',
  'auto',
  '{{name}}, ми помітили що ви давно не замовляли 💭

Заходьте подивитися нові надходження та акції!

👉 {{site_url}}/catalog',
  0, 0
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'inactive'
WHERE f.slug = 'reactivation'
ON CONFLICT DO NOTHING;
