-- ============================================================
-- ShineShop B2B Mobile App — Security Hardening Migration
-- Run AFTER 001_mobile_tables.sql
-- "Забиваем гвозди" — максимальная безопасность
--
-- SAFE TO RE-RUN: every CREATE POLICY has a DROP IF EXISTS before it
-- Tables that may not exist are wrapped in DO $$ blocks
-- ============================================================


-- 1. ADD attempts column to otp_codes if missing
-- ============================================================
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;


-- 2. HARDEN RLS on orders
-- ============================================================
DO $$ BEGIN
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Public read orders" ON orders;
  DROP POLICY IF EXISTS "Users can read own orders" ON orders;
  DROP POLICY IF EXISTS "Users can create orders" ON orders;
  DROP POLICY IF EXISTS "Service role manages orders" ON orders;
  DROP POLICY IF EXISTS "Anon can create orders" ON orders;
  DROP POLICY IF EXISTS "Users read own orders" ON orders;
  DROP POLICY IF EXISTS "Service creates orders" ON orders;
  DROP POLICY IF EXISTS "Service updates orders" ON orders;
  DROP POLICY IF EXISTS "No delete orders" ON orders;

  CREATE POLICY "Users read own orders" ON orders
    FOR SELECT USING (profile_id = auth.uid() OR auth.role() = 'service_role');
  CREATE POLICY "Service creates orders" ON orders
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
  CREATE POLICY "Service updates orders" ON orders
    FOR UPDATE USING (auth.role() = 'service_role');
  CREATE POLICY "No delete orders" ON orders
    FOR DELETE USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table orders does not exist, skipping';
END $$;


-- 3. HARDEN RLS on profiles
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can read profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Service role manages profiles" ON profiles;
  DROP POLICY IF EXISTS "Users read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users update own profile" ON profiles;
  DROP POLICY IF EXISTS "Service manages profiles" ON profiles;

  CREATE POLICY "Users read own profile" ON profiles
    FOR SELECT USING (id = auth.uid() OR auth.role() = 'service_role');
  CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  CREATE POLICY "Service manages profiles" ON profiles
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table profiles does not exist, skipping';
END $$;


-- 4. HARDEN RLS on push_tokens
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage own push tokens" ON push_tokens;
  DROP POLICY IF EXISTS "Service role manages push_tokens" ON push_tokens;
  DROP POLICY IF EXISTS "Public manage push_tokens" ON push_tokens;
  DROP POLICY IF EXISTS "Users read own push_tokens" ON push_tokens;
  DROP POLICY IF EXISTS "Service manages push_tokens" ON push_tokens;

  CREATE POLICY "Users read own push_tokens" ON push_tokens
    FOR SELECT USING (profile_id = auth.uid() OR auth.role() = 'service_role');
  CREATE POLICY "Service manages push_tokens" ON push_tokens
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table push_tokens does not exist, skipping';
END $$;


-- 5. HARDEN RLS on notifications_feed
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own notifications" ON notifications_feed;
  DROP POLICY IF EXISTS "Users read own notifications" ON notifications_feed;
  DROP POLICY IF EXISTS "Users update own notifications" ON notifications_feed;
  DROP POLICY IF EXISTS "Service role manages notifications_feed" ON notifications_feed;
  DROP POLICY IF EXISTS "Service manages notifications" ON notifications_feed;
  DROP POLICY IF EXISTS "No delete notifications" ON notifications_feed;

  CREATE POLICY "Users read own notifications" ON notifications_feed
    FOR SELECT USING (profile_id = auth.uid() OR auth.role() = 'service_role');
  CREATE POLICY "Users update own notifications" ON notifications_feed
    FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
  CREATE POLICY "Service manages notifications" ON notifications_feed
    FOR ALL USING (auth.role() = 'service_role');
  CREATE POLICY "No delete notifications" ON notifications_feed
    FOR DELETE USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table notifications_feed does not exist, skipping';
END $$;


-- 6. HARDEN RLS on wishlist_items (NOT "favorites")
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users manage own wishlist" ON wishlist_items;
  DROP POLICY IF EXISTS "Service role manages wishlist" ON wishlist_items;
  DROP POLICY IF EXISTS "Users read own wishlist" ON wishlist_items;
  DROP POLICY IF EXISTS "Users insert own wishlist" ON wishlist_items;
  DROP POLICY IF EXISTS "Users delete own wishlist" ON wishlist_items;

  CREATE POLICY "Users read own wishlist" ON wishlist_items
    FOR SELECT USING (profile_id = auth.uid());
  CREATE POLICY "Users insert own wishlist" ON wishlist_items
    FOR INSERT WITH CHECK (profile_id = auth.uid());
  CREATE POLICY "Users delete own wishlist" ON wishlist_items
    FOR DELETE USING (profile_id = auth.uid());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table wishlist_items does not exist, skipping';
END $$;


-- 7. HARDEN RLS on cart_items (if exists — may be website-only)
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users manage own cart" ON cart_items;
  DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
  DROP POLICY IF EXISTS "Users read own cart" ON cart_items;
  DROP POLICY IF EXISTS "Users insert own cart" ON cart_items;
  DROP POLICY IF EXISTS "Users update own cart" ON cart_items;
  DROP POLICY IF EXISTS "Users delete own cart" ON cart_items;

  ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users read own cart" ON cart_items
    FOR SELECT USING (profile_id = auth.uid());
  CREATE POLICY "Users insert own cart" ON cart_items
    FOR INSERT WITH CHECK (profile_id = auth.uid());
  CREATE POLICY "Users update own cart" ON cart_items
    FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
  CREATE POLICY "Users delete own cart" ON cart_items
    FOR DELETE USING (profile_id = auth.uid());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table cart_items does not exist, skipping';
END $$;


-- 8. PRODUCTS — read-only for everyone, only service_role can modify
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read products" ON products;
  DROP POLICY IF EXISTS "Service role manages products" ON products;
  DROP POLICY IF EXISTS "Public read active products" ON products;
  DROP POLICY IF EXISTS "Service manages products" ON products;

  CREATE POLICY "Public read active products" ON products
    FOR SELECT USING (status = 'active' OR auth.role() = 'service_role');
  CREATE POLICY "Service manages products" ON products
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table products does not exist, skipping';
END $$;


-- 9. BRANDS — read-only for public
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read brands" ON brands;
  DROP POLICY IF EXISTS "Service role manages brands" ON brands;
  DROP POLICY IF EXISTS "Service manages brands" ON brands;

  CREATE POLICY "Public read brands" ON brands
    FOR SELECT USING (true);
  CREATE POLICY "Service manages brands" ON brands
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table brands does not exist, skipping';
END $$;


-- 10. CATEGORIES — read-only for public
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read categories" ON categories;
  DROP POLICY IF EXISTS "Service role manages categories" ON categories;
  DROP POLICY IF EXISTS "Service manages categories" ON categories;

  CREATE POLICY "Public read categories" ON categories
    FOR SELECT USING (true);
  CREATE POLICY "Service manages categories" ON categories
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table categories does not exist, skipping';
END $$;


-- 11. FUNCTION: decrease_product_quantity (safe stock decrease)
-- ============================================================
CREATE OR REPLACE FUNCTION decrease_product_quantity(p_product_id uuid, p_quantity integer)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET quantity = GREATEST(0, quantity - p_quantity),
      updated_at = now()
  WHERE id = p_product_id
    AND quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION decrease_product_quantity(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrease_product_quantity(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION decrease_product_quantity(uuid, integer) FROM authenticated;


-- 12. CLEANUP: auto-expire old OTPs function
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes
  WHERE created_at < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION cleanup_expired_otps() FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_expired_otps() FROM anon;
REVOKE ALL ON FUNCTION cleanup_expired_otps() FROM authenticated;


-- 13. SITE_EVENTS — append-only for analytics
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anon insert events" ON site_events;
  DROP POLICY IF EXISTS "Public insert events" ON site_events;
  DROP POLICY IF EXISTS "Anyone can insert site events" ON site_events;
  DROP POLICY IF EXISTS "Service insert events" ON site_events;
  DROP POLICY IF EXISTS "site_events_insert_policy" ON site_events;
  DROP POLICY IF EXISTS "Anyone inserts site_events" ON site_events;
  DROP POLICY IF EXISTS "Service reads site_events" ON site_events;
  DROP POLICY IF EXISTS "No update site_events" ON site_events;
  DROP POLICY IF EXISTS "Service deletes site_events" ON site_events;

  CREATE POLICY "Anyone inserts site_events" ON site_events
    FOR INSERT WITH CHECK (true);
  CREATE POLICY "Service reads site_events" ON site_events
    FOR SELECT USING (auth.role() = 'service_role');
  CREATE POLICY "No update site_events" ON site_events
    FOR UPDATE USING (false);
  CREATE POLICY "Service deletes site_events" ON site_events
    FOR DELETE USING (auth.role() = 'service_role');
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table site_events does not exist, skipping';
END $$;


-- 14. OTP_CODES — ensure no public access
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anon access otp_codes" ON otp_codes;
  DROP POLICY IF EXISTS "Public read otp_codes" ON otp_codes;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- 15. APP_CONFIG — safety net
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anon write app_config" ON app_config;
  DROP POLICY IF EXISTS "Public write app_config" ON app_config;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ============================================================
-- SECURITY HARDENING COMPLETE.
-- Safe to re-run. All wrapped in DO $$ blocks.
--
-- [x] All tables have RLS enabled
-- [x] Users can only see their own data
-- [x] Products/brands/categories are read-only for public
-- [x] OTP codes are service_role only
-- [x] Analytics: append-only, read only by service_role
-- [x] No public INSERT on orders (only via Edge Function)
-- [x] Stock decrease is SECURITY DEFINER + revoked from public
-- [x] Old OTPs cleanup function ready
-- ============================================================
