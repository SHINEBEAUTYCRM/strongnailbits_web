-- AI джерела для брендів + кеш парсингу
-- ⚠️ Виконати вручну в Supabase Dashboard → SQL Editor

-- Нові поля для brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS source_urls TEXT[] DEFAULT '{}';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS source_notes TEXT DEFAULT '';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS ai_prompt_context TEXT DEFAULT '';

-- Кеш парсингу зовнішніх сайтів
CREATE TABLE IF NOT EXISTS ai_source_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  product_name TEXT,
  content TEXT,
  found BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_source_cache_url ON ai_source_cache(url, product_name);
CREATE INDEX IF NOT EXISTS idx_source_cache_expires ON ai_source_cache(expires_at);
