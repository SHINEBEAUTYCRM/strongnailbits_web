-- ============================================================
-- ShineShop B2B Mobile App — Create carts table
-- Required for cart sync between devices (useCartSync.ts)
-- ============================================================

CREATE TABLE IF NOT EXISTS carts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own cart
CREATE POLICY "Users manage own cart" ON carts
  FOR ALL USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Service role full access
CREATE POLICY "Service role manages carts" ON carts
  FOR ALL USING (auth.role() = 'service_role');

-- Index for fast lookup by profile
CREATE INDEX IF NOT EXISTS idx_carts_profile ON carts (profile_id);

-- Auto-update updated_at
DO $$ BEGIN
  CREATE TRIGGER set_updated_at_carts
    BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- DONE. Table 'carts' ready for useCartSync.ts
-- ============================================================
