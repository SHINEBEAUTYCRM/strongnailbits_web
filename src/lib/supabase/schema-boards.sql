-- ================================================================
--  Boards: tldraw whiteboard storage for Shine Board
-- ================================================================

CREATE TABLE IF NOT EXISTS boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Головна дошка',
  snapshot JSONB,                           -- tldraw document snapshot
  thumbnail TEXT,                            -- base64 preview (optional)
  created_by UUID REFERENCES team_members(id),
  updated_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON boards
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON boards
  FOR SELECT USING (true);

-- Realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE boards;

-- Default board
INSERT INTO boards (name) VALUES ('Головна дошка')
ON CONFLICT DO NOTHING;
