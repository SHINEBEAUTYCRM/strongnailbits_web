-- ============================================================
-- Таск-менеджер (канбан-борд) — schema
-- ============================================================

-- Таблиця задач
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  column_id TEXT NOT NULL DEFAULT 'new',      -- new | progress | review | done
  assignee_id UUID REFERENCES team_members(id),
  priority TEXT NOT NULL DEFAULT 'medium',    -- urgent | high | medium | low
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  linked_order TEXT,                          -- номер замовлення #SHINE-XXXX
  recurring JSONB,                            -- { freq: "daily"|"weekly", label: "Щодня о 9:00" }
  position INTEGER DEFAULT 0,                -- порядок всередині колонки (drag & drop)
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Чеклисти
CREATE TABLE task_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Коментарі
CREATE TABLE task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES team_members(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Активність (лог)
CREATE TABLE task_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,           -- created | moved | assigned | comment | checklist
  actor_id UUID REFERENCES team_members(id),
  details JSONB DEFAULT '{}',    -- { from: "new", to: "progress" } для moved
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Вкладення
CREATE TABLE task_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size TEXT,
  uploaded_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Індекси
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_task_checklist ON task_checklist(task_id);
CREATE INDEX idx_task_comments ON task_comments(task_id);
CREATE INDEX idx_task_activity ON task_activity(task_id);

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON tasks FOR ALL USING (true);
CREATE POLICY "Authenticated full access" ON task_checklist FOR ALL USING (true);
CREATE POLICY "Authenticated full access" ON task_comments FOR ALL USING (true);
CREATE POLICY "Authenticated full access" ON task_activity FOR ALL USING (true);
CREATE POLICY "Authenticated full access" ON task_attachments FOR ALL USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_checklist;
