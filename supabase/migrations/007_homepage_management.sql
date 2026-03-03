-- ================================================================
-- Homepage Management — динамічне управління головною сторінкою
-- ⚠️ Виконати вручну в Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Секції головної сторінки (порядок блоків)
CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  section_type TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  devices TEXT[] DEFAULT '{desktop,tablet,mobile}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Вітрини товарів (Product Showcases)
CREATE TABLE IF NOT EXISTS product_showcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title_uk TEXT NOT NULL,
  title_ru TEXT,
  subtitle_uk TEXT,
  subtitle_ru TEXT,
  source_type TEXT NOT NULL DEFAULT 'rule',
  rule JSONB DEFAULT '{}',
  sku_list TEXT[],
  product_limit INT DEFAULT 14,
  cta_text_uk TEXT DEFAULT 'Дивитись все',
  cta_text_ru TEXT DEFAULT 'Смотреть все',
  cta_url TEXT,
  sort_order INT DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  section_id UUID REFERENCES homepage_sections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Акція дня (Deal of the Day)
CREATE TABLE IF NOT EXISTS deal_of_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_uk TEXT NOT NULL,
  title_ru TEXT,
  subtitle_uk TEXT,
  subtitle_ru TEXT,
  end_at TIMESTAMPTZ NOT NULL,
  product_ids UUID[],
  category_id UUID,
  cta_text_uk TEXT DEFAULT 'Всі акції',
  cta_url TEXT DEFAULT '/catalog?sort=discount',
  bg_color TEXT DEFAULT '#FFF5F6',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Швидкі категорії на головній
CREATE TABLE IF NOT EXISTS quick_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  title_override_uk TEXT,
  title_override_ru TEXT,
  image_override TEXT,
  sort_order INT DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Сервісні блоки (Features / USP)
CREATE TABLE IF NOT EXISTS service_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_uk TEXT NOT NULL,
  title_ru TEXT,
  description_uk TEXT,
  description_ru TEXT,
  icon TEXT,
  link_url TEXT,
  color TEXT DEFAULT '#D6264A',
  sort_order INT DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Текстові блоки (B2B CTA, будь-які промо-тексти)
CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title_uk TEXT,
  title_ru TEXT,
  subtitle_uk TEXT,
  subtitle_ru TEXT,
  body_uk TEXT,
  body_ru TEXT,
  button_text_uk TEXT,
  button_text_ru TEXT,
  button_url TEXT,
  tags JSONB DEFAULT '[]',
  bg_color TEXT,
  text_color TEXT,
  image_url TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Top Bar лінки
CREATE TABLE IF NOT EXISTS top_bar_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_uk TEXT NOT NULL,
  label_ru TEXT,
  url TEXT NOT NULL,
  position TEXT DEFAULT 'left',
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_homepage_sections_sort ON homepage_sections(sort_order);
CREATE INDEX IF NOT EXISTS idx_product_showcases_code ON product_showcases(code);
CREATE INDEX IF NOT EXISTS idx_quick_categories_sort ON quick_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_service_features_sort ON service_features(sort_order);
CREATE INDEX IF NOT EXISTS idx_top_bar_links_sort ON top_bar_links(sort_order);

-- Сід-дані
INSERT INTO homepage_sections (code, title, section_type, sort_order, is_enabled, config) VALUES
  ('top_bar', 'Top Bar (сервісна панель)', 'top_bar', 0, true, '{}'),
  ('hero_slider', 'Hero Slider', 'banner_slot', 1, true, '{"banner_type": "hero_slider"}'),
  ('promo_strip', 'Промо-стрічка', 'banner_slot', 2, true, '{"banner_type": "promo_strip"}'),
  ('quick_categories', 'Швидкі категорії', 'categories', 3, true, '{"limit": 12}'),
  ('deal_of_day', 'Акція дня', 'deal', 4, true, '{}'),
  ('showcase_hits', 'Вітрина: Хіти', 'product_showcase', 5, true, '{"showcase_code": "hits"}'),
  ('showcase_new', 'Вітрина: Новинки', 'product_showcase', 6, true, '{"showcase_code": "new"}'),
  ('showcase_sale', 'Вітрина: Розпродаж', 'product_showcase', 7, true, '{"showcase_code": "sale"}'),
  ('features', 'Сервіс і довіра', 'features', 8, true, '{}'),
  ('b2b_cta', 'B2B CTA блок', 'cta', 9, true, '{"content_block_code": "b2b_cta"}'),
  ('help_contacts', 'Допомога / Контакти', 'help', 10, false, '{}')
ON CONFLICT (code) DO NOTHING;

INSERT INTO product_showcases (code, title_uk, title_ru, source_type, rule, product_limit, cta_url, sort_order, is_enabled) VALUES
  ('hits', 'Хіти продажів', 'Хиты продаж', 'rule', '{"sort": "popular"}', 14, '/catalog?sort=popular', 1, true),
  ('new', 'Новинки', 'Новинки', 'rule', '{"sort": "newest", "is_new": true}', 14, '/catalog?sort=newest', 2, true),
  ('sale', 'Розпродаж', 'Распродажа', 'rule', '{"sort": "discount", "has_discount": true}', 14, '/catalog?sort=discount', 3, true),
  ('recommended', 'Рекомендуємо', 'Рекомендуем', 'rule', '{"sort": "featured", "is_featured": true}', 14, '/catalog?is_featured=true', 4, false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO service_features (title_uk, title_ru, description_uk, description_ru, icon, color, sort_order, is_enabled) VALUES
  ('Безкоштовна доставка', 'Бесплатная доставка', 'Від 3 000 ₴ по Україні', 'От 3 000 ₴ по Украине', 'Truck', '#D6264A', 1, true),
  ('Оптові ціни', 'Оптовые цены', 'Від 1-ї одиниці для B2B', 'От 1-й единицы для B2B', 'Banknote', '#8B5CF6', 2, true),
  ('100% оригінал', '100% оригинал', 'Сертифікати на все', 'Сертификаты на все', 'ShieldCheck', '#008040', 3, true),
  ('Підтримка', 'Поддержка', 'Telegram, Viber, телефон', 'Telegram, Viber, телефон', 'Phone', '#0EA5E9', 4, true)
ON CONFLICT DO NOTHING;

INSERT INTO content_blocks (code, title_uk, title_ru, subtitle_uk, button_text_uk, button_url, tags, is_enabled) VALUES
  ('b2b_cta', 'Оптовим клієнтам — спеціальні умови', 'Оптовым клиентам — специальные условия', 'Реєструйтесь як B2B клієнт і отримуйте доступ до оптових цін, персонального менеджера та розширеного каталогу.', 'Дізнатися більше', '/wholesale', '["Знижки до -42%", "Відтермінування оплати", "Швидке замовлення по SKU", "Персональний менеджер"]', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO top_bar_links (label_uk, label_ru, url, position, sort_order, is_enabled) VALUES
  ('Акції', 'Акции', '/catalog?sort=discount', 'left', 1, true),
  ('Умови B2B', 'Условия B2B', '/wholesale', 'left', 2, true),
  ('Доставка', 'Доставка', '/delivery', 'left', 3, true),
  ('Повернення', 'Возврат', '/returns', 'left', 4, true),
  ('Контакти', 'Контакты', '/contacts', 'left', 5, true)
ON CONFLICT DO NOTHING;
