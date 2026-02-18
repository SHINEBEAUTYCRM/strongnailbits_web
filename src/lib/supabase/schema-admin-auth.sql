-- ================================================================
--  Admin Auth: Telegram-based authentication for ShineShop Admin
-- ================================================================

-- 1. Team members (who can access admin)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,              -- format: +380XXXXXXXXX
  role TEXT NOT NULL DEFAULT 'manager',    -- ceo, manager, content, developer
  telegram_chat_id BIGINT,                -- filled when user sends /start to bot
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed: initial team (replace +380XXXXXXXXX with real numbers)
INSERT INTO team_members (name, phone, role) VALUES
  ('Олександр Дандалі', '+380XXXXXXXXX', 'ceo'),
  ('Артем', '+380XXXXXXXXX', 'developer'),
  ('Марія', '+380XXXXXXXXX', 'manager'),
  ('Інна', '+380XXXXXXXXX', 'content'),
  ('Світлана', '+380XXXXXXXXX', 'manager')
ON CONFLICT (phone) DO NOTHING;

-- RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON team_members
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read own" ON team_members
  FOR SELECT USING (true);


-- 2. Auth requests (pending Telegram confirmations)
CREATE TABLE IF NOT EXISTS auth_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  team_member_id UUID REFERENCES team_members(id),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | expired
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_auth_requests_token ON auth_requests(token);
CREATE INDEX IF NOT EXISTS idx_auth_requests_status ON auth_requests(status);

ALTER TABLE auth_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON auth_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Enable Realtime for instant frontend updates
ALTER PUBLICATION supabase_realtime ADD TABLE auth_requests;


-- 3. Admin sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID REFERENCES team_members(id) NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON admin_sessions
  FOR ALL USING (auth.role() = 'service_role');
