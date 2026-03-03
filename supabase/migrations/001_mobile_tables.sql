-- ============================================================
-- ShineShop B2B Mobile App — Database Migration
-- New tables required for the mobile application
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. APP CONFIG — dynamic application configuration (key-value)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read config
CREATE POLICY "Public read app_config" ON app_config
  FOR SELECT USING (true);

-- Only service role can modify
CREATE POLICY "Service role manages app_config" ON app_config
  FOR ALL USING (auth.role() = 'service_role');

-- Seed default config
INSERT INTO app_config (key, value, description) VALUES
  ('free_shipping_threshold', '2500', 'Порог бесплатной доставки (грн)'),
  ('min_order_amount', '300', 'Минимальная сумма заказа (грн)'),
  ('phone', '"+380671234567"', 'Контактный телефон'),
  ('email', '"info@shineshopb2b.com"', 'Контактный email'),
  ('instagram', '"https://www.instagram.com/shineshop_b2b/"', 'Instagram'),
  ('telegram_channel', '"https://t.me/shineshop_b2b"', 'Telegram-канал'),
  ('working_hours', '{"mon_fri": "09:00-18:00", "sat": "10:00-15:00", "sun": "выходной"}', 'Режим работы'),
  ('address', '"м. Київ, вул. Прикладна, 12"', 'Физический адрес'),
  ('shipping_methods', '[
    {"id": "nova_poshta", "name_uk": "Нова Пошта (відділення)", "name_ru": "Новая Почта (отделение)", "icon": "truck"},
    {"id": "nova_poshta_courier", "name_uk": "Нова Пошта (кур''єр)", "name_ru": "Новая Почта (курьер)", "icon": "package"},
    {"id": "ukrposhta", "name_uk": "Укрпошта", "name_ru": "Укрпочта", "icon": "mail"},
    {"id": "pickup", "name_uk": "Самовивіз", "name_ru": "Самовывоз", "icon": "map-pin"}
  ]', 'Доступные способы доставки'),
  ('payment_methods', '[
    {"id": "cod", "name_uk": "Накладений платіж", "name_ru": "Наложенный платеж"},
    {"id": "invoice", "name_uk": "Рахунок-фактура", "name_ru": "Счёт-фактура"},
    {"id": "online", "name_uk": "Онлайн оплата", "name_ru": "Онлайн оплата"}
  ]', 'Доступные способы оплаты'),
  ('feature_flags', '{"loyalty_enabled": true, "b2b_prices_enabled": true, "chat_enabled": false}', 'Feature flags'),
  ('loyalty_tiers', '{"bronze": 0, "silver": 5000, "gold": 15000, "platinum": 50000}', 'Пороги лояльности'),
  ('maintenance_mode', 'false', 'Режим обслуживания'),
  ('min_app_version_ios', '"1.0.0"', 'Минимальная версия iOS'),
  ('min_app_version_android', '"1.0.0"', 'Минимальная версия Android')
ON CONFLICT (key) DO NOTHING;


-- 2. BANNERS — hero banners for mobile home screen
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title_uk text NOT NULL,
  title_ru text,
  subtitle_uk text,
  subtitle_ru text,
  image_url text NOT NULL,
  mobile_image_url text,
  link text,
  link_text_uk text,
  link_text_ru text,
  bg_color text DEFAULT '#FF6B6B',
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read banners" ON banners
  FOR SELECT USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "Service role manages banners" ON banners
  FOR ALL USING (auth.role() = 'service_role');

-- Index for active banners
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners (is_active, position)
  WHERE is_active = true;

-- Seed example banners
INSERT INTO banners (title_uk, title_ru, subtitle_uk, subtitle_ru, image_url, link, bg_color, position) VALUES
  ('Знижки до -30%', 'Скидки до -30%', 'На всю косметику для волосся', 'На всю косметику для волос',
   'https://placehold.co/800x400/FF6B6B/white?text=Sale+30%25', '/catalog', '#FF6B6B', 0),
  ('Нова колекція 2026', 'Новая коллекция 2026', 'Професійний догляд за шкірою', 'Профессиональный уход за кожей',
   'https://placehold.co/800x400/7C3AED/white?text=New+2026', '/catalog?new=true', '#7C3AED', 1)
ON CONFLICT DO NOTHING;


-- 3. PAGES — CMS pages for static content
-- ============================================================
CREATE TABLE IF NOT EXISTS pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title_uk text NOT NULL,
  title_ru text,
  content_uk text,
  content_ru text,
  meta_title_uk text,
  meta_title_ru text,
  meta_description_uk text,
  meta_description_ru text,
  is_active boolean DEFAULT true,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pages" ON pages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role manages pages" ON pages
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages (slug) WHERE is_active = true;

-- Seed initial pages
INSERT INTO pages (slug, title_uk, title_ru, content_uk, content_ru) VALUES
  ('about', 'Про нас', 'О нас',
   '# Про ShineShop B2B

ShineShop B2B — це оптова платформа професійної косметики. Ми працюємо з салонами краси, барбершопами, косметологічними кабінетами та іншими B2B-клієнтами.

## Наші переваги

- **Широкий асортимент** — більше 5000 позицій від 100+ брендів
- **Вигідні ціни** — спеціальні оптові ціни для B2B-клієнтів
- **Швидка доставка** — відправка протягом 24 годин
- **Програма лояльності** — накопичуйте бонуси та отримуйте знижки
- **Підтримка 24/7** — персональний менеджер для кожного клієнта',

   '# О ShineShop B2B

ShineShop B2B — это оптовая платформа профессиональной косметики. Мы работаем с салонами красоты, барбершопами, косметологическими кабинетами и другими B2B-клиентами.

## Наши преимущества

- **Широкий ассортимент** — более 5000 позиций от 100+ брендов
- **Выгодные цены** — специальные оптовые цены для B2B-клиентов
- **Быстрая доставка** — отправка в течение 24 часов
- **Программа лояльности** — накапливайте бонусы и получайте скидки
- **Поддержка 24/7** — персональный менеджер для каждого клиента'),

  ('contacts', 'Контакти', 'Контакты',
   '# Контакти

## Графік роботи
- **Пн-Пт**: 09:00 — 18:00
- **Сб**: 10:00 — 15:00
- **Нд**: вихідний

## Зв''язатися з нами
- **Телефон**: +38 (067) 123-45-67
- **Email**: info@shineshopb2b.com
- **Telegram**: @shineshop_b2b
- **Instagram**: @shineshop_b2b

## Адреса
м. Київ, вул. Прикладна, 12',

   '# Контакты

## График работы
- **Пн-Пт**: 09:00 — 18:00
- **Сб**: 10:00 — 15:00
- **Вс**: выходной

## Связаться с нами
- **Телефон**: +38 (067) 123-45-67
- **Email**: info@shineshopb2b.com
- **Telegram**: @shineshop_b2b
- **Instagram**: @shineshop_b2b

## Адрес
г. Киев, ул. Прикладная, 12'),

  ('delivery', 'Доставка та оплата', 'Доставка и оплата',
   '# Доставка та оплата

## Способи доставки

### Нова Пошта (відділення)
Доставка 1-3 дні. Безкоштовно від 2500 грн.

### Нова Пошта (кур''єр)
Доставка 1-2 дні. Вартість за тарифами перевізника.

### Укрпошта
Доставка 3-7 днів. Бюджетний варіант.

### Самовивіз
Безкоштовно. м. Київ, вул. Прикладна, 12.

## Способи оплати

- **Накладений платіж** — оплата при отриманні
- **Рахунок-фактура** — для юридичних осіб
- **Онлайн оплата** — карткою Visa/MasterCard',

   '# Доставка и оплата

## Способы доставки

### Новая Почта (отделение)
Доставка 1-3 дня. Бесплатно от 2500 грн.

### Новая Почта (курьер)
Доставка 1-2 дня. Стоимость по тарифам перевозчика.

### Укрпочта
Доставка 3-7 дней. Бюджетный вариант.

### Самовывоз
Бесплатно. г. Киев, ул. Прикладная, 12.

## Способы оплаты

- **Наложенный платёж** — оплата при получении
- **Счёт-фактура** — для юридических лиц
- **Онлайн оплата** — картой Visa/MasterCard'),

  ('wholesale', 'Оптовим клієнтам', 'Оптовым клиентам',
   '# Оптовим клієнтам

## Як стати B2B-клієнтом

1. Зареєструйтесь на сайті
2. Заповніть заявку на B2B-статус
3. Отримайте підтвердження від менеджера
4. Насолоджуйтесь оптовими цінами!

## Переваги B2B-клієнтів

- Спеціальні оптові ціни
- Відстрочка платежу
- Персональний менеджер
- Програма лояльності з підвищеними бонусами
- Пріоритетна доставка',

   '# Оптовым клиентам

## Как стать B2B-клиентом

1. Зарегистрируйтесь на сайте
2. Заполните заявку на B2B-статус
3. Получите подтверждение от менеджера
4. Наслаждайтесь оптовыми ценами!

## Преимущества B2B-клиентов

- Специальные оптовые цены
- Отсрочка платежа
- Персональный менеджер
- Программа лояльности с повышенными бонусами
- Приоритетная доставка'),

  ('privacy', 'Політика конфіденційності', 'Политика конфиденциальности',
   '# Політика конфіденційності

Ваша конфіденційність важлива для нас. Ця політика описує, як ShineShop B2B збирає, використовує та захищає вашу персональну інформацію.

## Які дані ми збираємо

- Контактні дані (ім''я, телефон, email)
- Адреса доставки
- Історія замовлень
- Дані про використання додатку

## Як ми використовуємо дані

- Обробка замовлень
- Зв''язок з клієнтами
- Поліпшення сервісу
- Маркетингові комунікації (за вашою згодою)',

   '# Политика конфиденциальности

Ваша конфиденциальность важна для нас. Эта политика описывает, как ShineShop B2B собирает, использует и защищает вашу персональную информацию.

## Какие данные мы собираем

- Контактные данные (имя, телефон, email)
- Адрес доставки
- История заказов
- Данные об использовании приложения

## Как мы используем данные

- Обработка заказов
- Связь с клиентами
- Улучшение сервиса
- Маркетинговые коммуникации (с вашего согласия)'),

  ('faq', 'Часті запитання', 'Частые вопросы',
   '# Часті запитання

## Як зробити замовлення?
Додайте товари до кошика, перейдіть до оформлення і заповніть форму.

## Яка мінімальна сума замовлення?
Мінімальна сума замовлення — 300 грн.

## Коли безкоштовна доставка?
Доставка безкоштовна при замовленні від 2500 грн.

## Як відстежити замовлення?
Після відправки ви отримаєте ТТН номер для відстеження.

## Як повернути товар?
Зверніться до менеджера протягом 14 днів після отримання.',

   '# Частые вопросы

## Как сделать заказ?
Добавьте товары в корзину, перейдите к оформлению и заполните форму.

## Какая минимальная сумма заказа?
Минимальная сумма заказа — 300 грн.

## Когда бесплатная доставка?
Доставка бесплатна при заказе от 2500 грн.

## Как отследить заказ?
После отправки вы получите ТТН номер для отслеживания.

## Как вернуть товар?
Обратитесь к менеджеру в течение 14 дней после получения.')
ON CONFLICT (slug) DO NOTHING;


-- 4. PUSH TOKENS — device push notification tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id text,
  app_version text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users manage own push_tokens" ON push_tokens
  FOR ALL USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Service role can do anything
CREATE POLICY "Service role manages push_tokens" ON push_tokens
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_push_tokens_profile ON push_tokens (profile_id)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens (token);


-- 5. NOTIFICATIONS FEED — in-app notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications_feed (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text,
  link text,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications_feed ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users read own notifications" ON notifications_feed
  FOR SELECT USING (auth.uid() = profile_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications" ON notifications_feed
  FOR UPDATE USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Service role can do everything
CREATE POLICY "Service role manages notifications" ON notifications_feed
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications_feed (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications_feed (profile_id, is_read)
  WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications_feed;


-- 6. WISHLIST ITEMS — user wishlists (synced across devices)
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, product_id)
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wishlist" ON wishlist_items
  FOR ALL USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Service role manages wishlist" ON wishlist_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_wishlist_profile ON wishlist_items (profile_id, created_at DESC);


-- 7. RECENTLY VIEWED — last viewed products
-- ============================================================
CREATE TABLE IF NOT EXISTS recently_viewed (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, product_id)
);

ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recently_viewed" ON recently_viewed
  FOR ALL USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Service role manages recently_viewed" ON recently_viewed
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_recently_viewed_profile ON recently_viewed (profile_id, viewed_at DESC);


-- 8. OTP CODES — phone verification
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL,
  code text NOT NULL,
  used boolean DEFAULT false,
  attempts integer DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can access (Edge Functions use service_role key)
CREATE POLICY "Service role manages otp_codes" ON otp_codes
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes (phone, created_at DESC);

-- Auto-clean old OTP codes (optional — set up pg_cron or a scheduled function)
-- SELECT cron.schedule('clean_old_otps', '0 */6 * * *', $$DELETE FROM otp_codes WHERE created_at < now() - interval '1 day'$$);


-- 9. SITE EVENTS — already exists from website, just add missing columns
-- ============================================================
ALTER TABLE site_events ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE site_events ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}';

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_site_events_user ON site_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;


-- 10. HELPER FUNCTIONS
-- ============================================================

-- Function to update 'updated_at' automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (safe: skip if already exist)
DO $$ BEGIN
  CREATE TRIGGER set_updated_at_app_config BEFORE UPDATE ON app_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_banners BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_pages BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_push_tokens BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- DONE! All tables created for ShineShop B2B Mobile App.
-- ============================================================
