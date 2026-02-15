-- ================================================================
--  Seed: 3 hero_slider banners with gradient backgrounds
--  Run manually in Supabase SQL Editor
-- ================================================================

INSERT INTO banners (
  title, heading, subheading, button_text, button_url,
  type, placement, is_active, sort_order, priority,
  bg_color, text_color, overlay_opacity
) VALUES
(
  'Hero: Spring Sale',
  'Весняний розпродаж -30%',
  'На всю професійну косметику для волосся. Тільки до кінця місяця!',
  'Перейти до каталогу',
  '/catalog',
  'hero_slider',
  '["home"]',
  true,
  0,
  2,
  '#1a0533',
  '#FFFFFF',
  20
),
(
  'Hero: New Brands',
  'Нові бренди в каталозі',
  'Зустрічайте преміальні бренди: Olaplex, Kevin Murphy, Moroccanoil та інші.',
  'Дивитись бренди',
  '/brands',
  'hero_slider',
  '["home"]',
  true,
  1,
  1,
  '#0a1628',
  '#FFFFFF',
  25
),
(
  'Hero: B2B Registration',
  'Оптові ціни для салонів',
  'Зареєструйтесь як B2B клієнт і отримайте спеціальні ціни та персонального менеджера.',
  'Зареєструватись',
  '/register',
  'hero_slider',
  '["home"]',
  true,
  2,
  1,
  '#14210a',
  '#FFFFFF',
  15
);
