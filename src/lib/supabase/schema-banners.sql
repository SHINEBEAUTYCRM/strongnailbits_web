-- ================================================================
--  ShineShop OS — Banners Schema
--  Система керування банерами
-- ================================================================

-- Таблиця банерів
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Контент
  title VARCHAR(200) NOT NULL,
  heading VARCHAR(200),
  subheading VARCHAR(300),
  button_text VARCHAR(50),
  button_url VARCHAR(500),
  promo_code VARCHAR(50),
  discount_text VARCHAR(100),

  -- Зображення
  image_desktop VARCHAR(500),
  image_mobile VARCHAR(500),
  image_alt VARCHAR(200),

  -- Тип та розташування
  type VARCHAR(30) NOT NULL DEFAULT 'hero_slider',
  placement JSONB DEFAULT '[]'::jsonb,

  -- Планування
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,

  -- Порядок та пріоритет
  sort_order INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,

  -- Стилізація
  bg_color VARCHAR(7),
  text_color VARCHAR(7) DEFAULT '#FFFFFF',
  overlay_opacity DECIMAL(3,2) DEFAULT 0,

  -- Аналітика
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,

  -- Мета
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners (is_active, type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_banners_dates ON banners (starts_at, ends_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners USING GIN (placement);
CREATE INDEX IF NOT EXISTS idx_banners_sort ON banners (type, sort_order);

-- RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Публічне читання активних банерів
CREATE POLICY "Public can view active banners" ON banners
  FOR SELECT USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- Trigger для updated_at
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banners_updated_at();

-- RPC: інкремент переглядів
CREATE OR REPLACE FUNCTION increment_banner_views(banner_id UUID)
RETURNS void AS $$
  UPDATE banners SET views_count = views_count + 1 WHERE id = banner_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- RPC: інкремент кліків
CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS void AS $$
  UPDATE banners SET clicks_count = clicks_count + 1 WHERE id = banner_id;
$$ LANGUAGE sql SECURITY DEFINER;
