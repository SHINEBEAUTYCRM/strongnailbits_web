-- ============================================================
-- Розширення team_members + KPI
-- ============================================================

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS position_title TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS schedule TEXT DEFAULT '5/2',
  ADD COLUMN IF NOT EXISTS work_hours TEXT DEFAULT '09:00-18:00',
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS personal_bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#a855f7';

-- KPI
CREATE TABLE team_kpi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  metric TEXT NOT NULL,
  target NUMERIC,
  actual NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_team_kpi_member ON team_kpi(member_id);
ALTER TABLE team_kpi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON team_kpi FOR ALL USING (true);
