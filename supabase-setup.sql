-- ============================================================
-- AppFactory — Supabase Setup
-- ============================================================

-- 1. Tabela app_submissions
CREATE TABLE IF NOT EXISTS app_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  generated_html TEXT,
  artifact_slug TEXT UNIQUE NOT NULL,
  score_innovation INTEGER,
  score_business INTEGER,
  score_prompt INTEGER,
  score_avg NUMERIC,
  ai_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE app_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on app_submissions"
  ON app_submissions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Tabela session_control
-- Jeśli tabela już istnieje (z CLEAR Challenge), dodaj kolumnę:
-- ALTER TABLE session_control ADD COLUMN IF NOT EXISTS app_session BOOLEAN DEFAULT false;

-- Jeśli tabela NIE istnieje, utwórz ją:
CREATE TABLE IF NOT EXISTS session_control (
  id INTEGER PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT false,
  ends_at TIMESTAMPTZ,
  scoring_done BOOLEAN NOT NULL DEFAULT false,
  app_session BOOLEAN NOT NULL DEFAULT false,
  topic_constraint TEXT,
  prompt_max_length INTEGER NOT NULL DEFAULT 100
);

ALTER TABLE session_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on session_control"
  ON session_control FOR ALL
  USING (true)
  WITH CHECK (true);

-- Wstaw rekord dla AppFactory (id=2)
INSERT INTO session_control (id, is_active, ends_at, scoring_done, app_session)
VALUES (2, false, NULL, false, false)
ON CONFLICT (id) DO UPDATE SET app_session = EXCLUDED.app_session;

-- Jeśli tabela istniała wcześniej i nie ma nowych kolumn:
ALTER TABLE session_control ADD COLUMN IF NOT EXISTS app_session BOOLEAN DEFAULT false;
ALTER TABLE session_control ADD COLUMN IF NOT EXISTS topic_constraint TEXT;
ALTER TABLE session_control ADD COLUMN IF NOT EXISTS prompt_max_length INTEGER DEFAULT 100;
ALTER TABLE session_control ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'pl';

-- 3. Włącz Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE app_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_control;
