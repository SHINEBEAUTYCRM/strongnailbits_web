-- ============================================
-- site_settings — single source of truth for all site content
-- ============================================

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings_read" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "site_settings_write" ON site_settings
  FOR ALL USING (true);

CREATE OR REPLACE FUNCTION update_site_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_settings_updated
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_timestamp();

-- Seed data
INSERT INTO site_settings (key, value) VALUES
('contacts', '{"phone":"+38 (093) 744-38-89","phone_raw":"+380937443889","email":"shine.shop.od@gmail.com","address":"м. Одеса, Грецька площа 3/4, ТЦ «Афіна», 4 поверх","address_short":"Одеса, Грецька пл. 3/4","map_url":"https://maps.google.com/?q=Грецька+площа+3/4+Одеса","schedule":{"weekdays":"Пн-Пт: 9:00 – 18:00","saturday":"Сб: 10:00 – 15:00","sunday":"Нд: вихідний","support_hours":"9:00 – 21:00"}}'::jsonb),
('social', '{"instagram":{"url":"https://www.instagram.com/shineshop.com.ua/","label":"Instagram"},"telegram":{"url":"https://t.me/shineshop_ua","label":"Telegram"},"facebook":{"url":"https://www.facebook.com/shineshop.com.ua/","label":"Facebook"},"tiktok":{"url":"","label":"TikTok"},"youtube":{"url":"","label":"YouTube"}}'::jsonb),
('theme', '{"colors":{"bg":"#f5f5f7","bg2":"#e8e8e8","card":"#FFFFFF","coral":"#D6264A","coral2":"#B8203F","violet":"#8B5CF6","dark":"#1a1a1a","text_primary":"#1a1a1a","text_secondary":"#6b6b7b","text_muted":"#6e6e7a","green":"#008040","amber":"#C27400","red":"#E0352B","border":"#f0f0f0"},"radii":{"card":"16px","pill":"50px"},"fonts":{"heading":"Unbounded","body":"Inter","mono":"JetBrains Mono"}}'::jsonb),
('seo', '{"title_default":"SHINE SHOP — Професійна nail-косметика","title_template":"%s | SHINE SHOP","description":"Професійна косметика для nail-майстрів. Гель-лаки, бази, топи, інструменти. Оптові ціни від 1-ої одиниці. Доставка по Україні.","keywords":["гель-лак оптом","nail косметика","B2B краса","Shine Shop","манікюр"],"og_image":"","theme_color":"#f5f5f7"}'::jsonb),
('features', '[{"icon":"truck","title":"Безкоштовна доставка","desc":"При замовленні від 2 000 ₴","color":"#008040","bg":"rgba(0,128,64,0.06)"},{"icon":"percent","title":"Оптові ціни","desc":"Від 1-ої одиниці","color":"#8B5CF6","bg":"rgba(139,92,246,0.06)"},{"icon":"shield-check","title":"100% оригінал","desc":"Гарантія автентичності","color":"#D6264A","bg":"rgba(214,38,74,0.06)"},{"icon":"headphones","title":"Підтримка","desc":"Щодня 9:00 – 21:00","color":"#0ea5e9","bg":"rgba(14,165,233,0.06)"}]'::jsonb),
('stats', '[{"value":"14 800+","label":"товарів"},{"value":"90+","label":"брендів"},{"value":"7 000+","label":"клієнтів"},{"value":"8","label":"років"}]'::jsonb),
('b2b_cta', '{"badge":"B2B","title":"Оптовим клієнтам — спеціальні умови","description":"Реєструйтесь як B2B клієнт і отримуйте доступ до оптових цін, персонального менеджера та розширеного каталогу.","button_text":"Стати оптовиком","button_href":"/wholesale","perks":["Знижки до -42%","Відтермінування оплати","Швидке замовлення по SKU","Персональний менеджер"]}'::jsonb),
('delivery', '{"free_shipping_threshold":2000,"methods":[{"icon":"truck","title":"Нова Пошта","desc":"Доставка у відділення або адресна. Термін: 1-2 дні.","price":"За тарифами НП"},{"icon":"truck","title":"УкрПошта","desc":"Економічна доставка. Термін: 3-5 днів.","price":"За тарифами УП"},{"icon":"map-pin","title":"Самовивіз","desc":"Забрати в нашому магазині.","price":"Безкоштовно"}],"payment":[{"icon":"banknote","title":"Накладений платіж","desc":"Оплата при отриманні у відділенні."},{"icon":"credit-card","title":"Передплата на карту","desc":"Переказ на карту ПриватБанку."},{"icon":"shield-check","title":"Безготівковий розрахунок","desc":"Для юридичних осіб та ФОП."}],"processing":{"same_day_cutoff":"15:00","weekday_hours":"Пн-Пт 9:00-18:00","saturday_hours":"Сб 10:00-15:00"},"returns":{"period_days":14,"conditions":"Товар повинен бути в оригінальній упаковці, не використаний"}}'::jsonb),
('wholesale', '{"benefits":[{"icon":"percent","title":"Знижки до 42%","desc":"Чим більше замовлення — тим вигідніше"},{"icon":"clock","title":"Відтермінування оплати","desc":"До 14 днів для постійних клієнтів"},{"icon":"file-text","title":"Рахунок-фактура","desc":"Офіційні документи для ФОП та ТОВ"},{"icon":"user","title":"Персональний менеджер","desc":"Швидке вирішення питань"},{"icon":"truck","title":"Пріоритетна відправка","desc":"Замовлення обробляються першими"},{"icon":"gift","title":"Бонусна програма","desc":"Накопичуйте бонуси з кожної покупки"}],"discount_tiers":[{"range":"5 000 – 15 000 ₴","discount":"5%"},{"range":"15 000 – 30 000 ₴","discount":"8%"},{"range":"30 000 – 75 000 ₴","discount":"12%"},{"range":"від 75 000 ₴","discount":"15%"}]}'::jsonb),
('footer', '{"description":"Професійна nail-косметика для майстрів та салонів. Оптові ціни від 1 одиниці. Доставка по Україні та за кордон.","catalog_links":[{"label":"Гель-лаки","href":"/catalog/gel-laki"},{"label":"Бази","href":"/catalog/bazy"},{"label":"Топи","href":"/catalog/topy"},{"label":"Для обличчя і тіла","href":"/catalog/dlya-oblychya-i-tila"},{"label":"Брови і вії","href":"/catalog/brovy-i-viji"},{"label":"Депіляція","href":"/catalog/depilyaciya"}],"info_links":[{"label":"Доставка і оплата","href":"/delivery"},{"label":"Оптовим клієнтам","href":"/wholesale"},{"label":"Повернення і обмін","href":"/returns"},{"label":"Про нас","href":"/about"},{"label":"Контакти","href":"/contacts"},{"label":"Політика конфіденційності","href":"/privacy"}]}'::jsonb),
('homepage', '{"sections":[{"id":"hero","enabled":true,"order":0},{"id":"quick_categories","enabled":true,"order":1},{"id":"popular_products","enabled":true,"order":2,"title":"Популярні товари","limit":14},{"id":"sale_products","enabled":true,"order":3,"title":"Зі знижкою","limit":14},{"id":"new_products","enabled":true,"order":4,"title":"Новинки","limit":14},{"id":"brands","enabled":false,"order":5,"title":"Бренди"},{"id":"stories","enabled":false,"order":6},{"id":"deal_of_day","enabled":false,"order":7},{"id":"features","enabled":true,"order":8},{"id":"b2b_cta","enabled":true,"order":9},{"id":"categories_grid","enabled":false,"order":10,"title":"Категорії"}]}'::jsonb)
ON CONFLICT (key) DO NOTHING;
