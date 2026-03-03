-- Додаткові поля для брендів (якщо ще не існують)
-- ⚠️ Виконати вручну в Supabase Dashboard → SQL Editor
ALTER TABLE brands ADD COLUMN IF NOT EXISTS description_uk TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS description_ru TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
