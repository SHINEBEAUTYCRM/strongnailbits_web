-- ========================================
-- Shine Shop Telegram Bot — Reminders & Consumables
-- Run in Supabase SQL Editor
-- ========================================

-- 1. RPC function for SUM of product quantities
CREATE OR REPLACE FUNCTION sum_product_quantity()
RETURNS bigint AS $$
  SELECT COALESCE(sum(quantity), 0) FROM products;
$$ LANGUAGE sql STABLE;

-- Optional: sum only active products
CREATE OR REPLACE FUNCTION sum_active_product_quantity()
RETURNS bigint AS $$
  SELECT COALESCE(sum(quantity), 0) FROM products WHERE status = 'active';
$$ LANGUAGE sql STABLE;

-- 2. Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id bigint NOT NULL,
  user_id uuid REFERENCES profiles(id),
  message text NOT NULL,
  search_query text,
  remind_at timestamptz NOT NULL,
  sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending
  ON reminders(remind_at)
  WHERE sent = false;

-- 3. Consumables table
CREATE TABLE IF NOT EXISTS consumables (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id bigint NOT NULL,
  user_id uuid REFERENCES profiles(id),
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  product_sku text,
  product_price numeric,
  cycle_days integer NOT NULL,
  remind_days_before integer NOT NULL DEFAULT 3,
  next_remind_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  times_ordered integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consumables_pending
  ON consumables(next_remind_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_consumables_user
  ON consumables(telegram_id);
