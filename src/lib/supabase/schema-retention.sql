-- ================================================================
--  SMART Retention — воронки, сообщения, расширения
--  Брошенная корзина, Welcome-серия, Пост-покупочная серия
-- ================================================================

-- 1. Расширение таблицы funnel_messages: кнопки и фото
ALTER TABLE funnel_messages ADD COLUMN IF NOT EXISTS buttons_json TEXT;
  -- JSON массив inline-кнопок для Telegram
  -- Формат: [[{"text":"🛒 Замовити","url":"{{site_url}}/cart"}],[{"text":"📞 Контакти","callback_data":"quick:contacts"}]]
ALTER TABLE funnel_messages ADD COLUMN IF NOT EXISTS photo_url TEXT;
  -- URL фото для Telegram (поддерживает {{переменные}})

-- ================================================================
--  2. Воронка: Telegram Welcome-серия
-- ================================================================

INSERT INTO funnels (name, slug, description, color, icon, is_default)
VALUES ('Telegram Welcome', 'telegram-welcome', 'Welcome-серія для нових Telegram-користувачів: привітання → поради → перше замовлення', '#06b6d4', 'MessageCircle', true)
ON CONFLICT (slug) DO NOTHING;

-- Этап 1: Запустил бота
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Запустив бота', 'started', 0, '#06b6d4',
  '[{"event": "telegram_start", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'telegram-welcome'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- Этап 2: Получил советы (через 24ч)
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Отримав поради', 'tips_sent', 1, '#0ea5e9',
  '[]'::jsonb
FROM funnels WHERE slug = 'telegram-welcome'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- Этап 3: Первый заказ через бота
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Перше замовлення', 'first_order', 2, '#10b981',
  '[{"event": "order_placed", "conditions": {"is_first": true}}]'::jsonb
FROM funnels WHERE slug = 'telegram-welcome'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- Сообщение 1: Приветствие (сразу)
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order, buttons_json)
SELECT f.id, s.id,
  'Telegram Welcome — Привітання',
  'telegram',
  '👋 <b>Вітаємо у ShineShop B2B, {{name}}!</b>

Я — ваш персональний бот-помічник. Ось що я вмію:

🔍 <b>Пошук товарів</b> — напишіть назву або бренд
🛒 <b>Кошик і замовлення</b> — все через бота
📦 <b>Трекінг доставки</b> — статус Нової Пошти
🔄 <b>Витратні матеріали</b> — нагадування про закупку
💰 <b>Оптові ціни</b> — спеціальні умови для B2B

Просто напишіть що шукаєте — я знайду найкращий варіант! 👇',
  0, 0,
  '[[{"text":"🔍 Пошук товарів","callback_data":"quick:search"}],[{"text":"🆕 Новинки","callback_data":"quick:new"},{"text":"📞 Контакти","callback_data":"quick:contacts"}]]'
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'started'
WHERE f.slug = 'telegram-welcome'
ON CONFLICT DO NOTHING;

-- Сообщение 2: Советы (через 24 часа = 1440 мин)
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order, buttons_json)
SELECT f.id, s.id,
  'Telegram Welcome — Поради',
  'telegram',
  '💡 <b>{{name}}, кілька порад для зручної роботи:</b>

1️⃣ <b>Швидкий пошук</b> — просто напишіть "лампа LED" або "гель-лак Kodi"
2️⃣ <b>Витратні</b> — додайте товари які купуєте регулярно, бот нагадає коли закінчуються
3️⃣ <b>Замовлення по SKU</b> — якщо знаєте артикул, напишіть його напряму
4️⃣ <b>Кнопки внизу</b> — використовуйте меню для швидкого доступу

🎯 Спробуйте зараз — напишіть назву будь-якого товару!',
  1440, 0,
  '[[{"text":"🔍 Спробувати пошук","callback_data":"quick:search"}],[{"text":"🔄 Налаштувати витратні","callback_data":"my_consumables"}]]'
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'started'
WHERE f.slug = 'telegram-welcome'
ON CONFLICT DO NOTHING;

-- Сообщение 3: Спецпредложение на первый заказ (через 72 часа = 4320 мин)
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order, buttons_json)
SELECT f.id, s.id,
  'Telegram Welcome — Перше замовлення',
  'telegram',
  '🎁 <b>{{name}}, спеціально для вас!</b>

Ви ще не зробили перше замовлення через бота. Не пропустіть:

✅ Оптові ціни на весь каталог
✅ Безкоштовна консультація
✅ Швидка доставка Новою Поштою

Перегляньте наші <b>бестселери та новинки</b> — або напишіть що саме шукаєте!',
  4320, 1,
  '[[{"text":"🆕 Новинки","callback_data":"quick:new"}],[{"text":"🔍 Пошук","callback_data":"quick:search"},{"text":"📞 Зв''язатись","callback_data":"quick:contacts"}]]'
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'started'
WHERE f.slug = 'telegram-welcome'
ON CONFLICT DO NOTHING;

-- ================================================================
--  3. Воронка: Брошенная корзина
-- ================================================================

INSERT INTO funnels (name, slug, description, color, icon, is_default)
VALUES ('Покинутий кошик', 'abandoned-cart', 'Товар у кошику → 2ч нагадування → 24ч пропозиція → відновлений', '#f59e0b', 'ShoppingCart', true)
ON CONFLICT (slug) DO NOTHING;

-- Этап 1: Добавил в корзину
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Додав у кошик', 'cart_added', 0, '#f59e0b',
  '[{"event": "add_to_cart", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'abandoned-cart'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- Этап 2: Напоминание через 2ч
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Нагадування 2г', 'reminder_2h', 1, '#f97316',
  '[{"event": "cart_abandoned", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'abandoned-cart'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- Этап 3: Напоминание через 24ч
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Нагадування 24г', 'reminder_24h', 2, '#ef4444',
  '[{"event": "cart_abandoned_24h", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'abandoned-cart'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- Этап 4: Восстановлен (оформил заказ)
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Відновлений', 'recovered', 3, '#10b981',
  '[{"event": "order_placed", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'abandoned-cart'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- Сообщение: Напоминание через 2 часа (мягкое)
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order, buttons_json)
SELECT f.id, s.id,
  'Кошик — м''яке нагадування',
  'telegram',
  '🛒 <b>{{name}}, у вашому кошику є товари!</b>

Ви додали товари але не завершили замовлення. Не забудьте — ціни та наявність можуть змінитись.

Напишіть "Кошик" щоб переглянути або оформити замовлення 👇',
  0, 0,
  '[[{"text":"🛒 Переглянути кошик","callback_data":"quick:cart"}],[{"text":"📞 Потрібна допомога?","callback_data":"quick:contacts"}]]'
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'reminder_2h'
WHERE f.slug = 'abandoned-cart'
ON CONFLICT DO NOTHING;

-- Сообщение: Напоминание через 24 часа (последний шанс)
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order, buttons_json)
SELECT f.id, s.id,
  'Кошик — останній шанс',
  'telegram',
  '⏰ <b>{{name}}, ваш кошик чекає!</b>

Товари у вашому кошику вже добу. Наявність обмежена — оформіть замовлення поки все є.

Якщо є питання — просто напишіть, я допоможу! 🤝',
  0, 0,
  '[[{"text":"🛒 Оформити замовлення","callback_data":"quick:cart"}],[{"text":"🔍 Шукати інше","callback_data":"quick:search"}]]'
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'reminder_24h'
WHERE f.slug = 'abandoned-cart'
ON CONFLICT DO NOTHING;

-- ================================================================
--  4. Расширение воронки продаж — пост-покупочная серия
-- ================================================================

-- Добавим этап "Доставлено" к воронке продаж
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Доставлено', 'delivered', 5, '#059669',
  '[{"event": "order_delivered", "conditions": {}}]'::jsonb
FROM funnels WHERE slug = 'sales'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- Сообщение: Кросс-продажа через 3 дня после заказа (4320 мин)
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order, buttons_json)
SELECT f.id, s.id,
  'Після замовлення — кросс-продаж',
  'telegram',
  '💫 <b>{{name}}, як вам покупка?</b>

Сподіваємось все чудово! Може ще щось потрібно? Напишіть що шукаєте — я підберу найкращі варіанти.

🔥 Подивіться наші <b>новинки</b> — щотижня оновлюємо каталог!',
  4320, 1,
  '[[{"text":"🆕 Новинки","callback_data":"quick:new"}],[{"text":"🔍 Пошук","callback_data":"quick:search"}]]'
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'ordered'
WHERE f.slug = 'sales'
ON CONFLICT DO NOTHING;

-- Сообщение: Запрос отзыва после доставки
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order, buttons_json)
SELECT f.id, s.id,
  'Після доставки — відгук',
  'telegram',
  '📦 <b>{{name}}, ваше замовлення доставлено!</b>

Як вам товари? Ваша думка дуже важлива для нас! 🙏

Якщо щось не так — напишіть, ми вирішимо будь-яке питання.',
  60, 0,
  '[[{"text":"⭐ Все чудово!","callback_data":"review:positive"}],[{"text":"😐 Є зауваження","callback_data":"review:neutral"},{"text":"😞 Проблема","callback_data":"review:negative"}]]'
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'delivered'
WHERE f.slug = 'sales'
ON CONFLICT DO NOTHING;

-- Сообщение: Напоминание о повторной закупке через 14 дней (20160 мин)
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order, buttons_json)
SELECT f.id, s.id,
  'Після доставки — повторна закупка',
  'telegram',
  '🔄 <b>{{name}}, час поповнити запаси?</b>

Минуло 2 тижні з вашого останнього замовлення. Потрібно щось повторити?

💡 Порада: додайте товари у "Витратні" — бот нагадає коли час купувати!',
  20160, 1,
  '[[{"text":"📦 Мої замовлення","callback_data":"quick:orders"}],[{"text":"🔄 Мої витратні","callback_data":"my_consumables"}],[{"text":"🔍 Пошук","callback_data":"quick:search"}]]'
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'delivered'
WHERE f.slug = 'sales'
ON CONFLICT DO NOTHING;

-- ================================================================
--  5. Расширение воронки реактивации — мультишаговая серия
-- ================================================================

-- Добавим этап "Спеціальна пропозиція" к воронке реактивации
INSERT INTO funnel_stages (funnel_id, name, slug, position, color, auto_triggers)
SELECT id, 'Спецпропозиція', 'special_offer', 1, '#f59e0b',
  '[]'::jsonb
FROM funnels WHERE slug = 'reactivation'
ON CONFLICT (funnel_id, slug) DO NOTHING;

-- Сообщение: Спецпредложение через 7 дней после первого касания (10080 мин)
INSERT INTO funnel_messages (funnel_id, stage_id, name, channel, template, delay_minutes, sort_order, buttons_json)
SELECT f.id, s.id,
  'Реактивація — спецпропозиція',
  'telegram',
  '🎁 <b>{{name}}, ми підготували щось для вас!</b>

Давно не бачились! Подивіться наші найпопулярніші товари цього тижня — можливо знайдете щось цікаве.

Ми завжди раді вашим замовленням! 💙',
  10080, 0,
  '[[{"text":"🔥 Популярне","callback_data":"quick:new"}],[{"text":"🔍 Пошук","callback_data":"quick:search"}]]'
FROM funnels f
JOIN funnel_stages s ON s.funnel_id = f.id AND s.slug = 'inactive'
WHERE f.slug = 'reactivation'
ON CONFLICT DO NOTHING;

-- Обновим существующее сообщение реактивации с кнопками
-- (это для нового формата — старое без кнопок останется, но новые будут с кнопками)

-- ================================================================
--  6. Таблица для трекинга отправки воронковых сообщений (дедупликация)
-- ================================================================

-- Колонка для отслеживания последнего abandoned cart оповещения
ALTER TABLE carts ADD COLUMN IF NOT EXISTS last_abandon_notified_at TIMESTAMPTZ;
ALTER TABLE carts ADD COLUMN IF NOT EXISTS abandon_notify_count INTEGER DEFAULT 0;

-- Индекс для быстрого поиска брошенных корзин
CREATE INDEX IF NOT EXISTS idx_carts_abandon ON carts(updated_at)
  WHERE profile_id IS NOT NULL;

-- ================================================================
--  Готово. Выполнить в Supabase SQL Editor.
-- ================================================================
