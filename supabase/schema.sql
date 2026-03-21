-- ═══════════════════════════════════════════════════════════
-- SCOLARIA — Schéma de base de données Supabase
-- ═══════════════════════════════════════════════════════════
--
-- Exécute ce fichier dans le SQL Editor de ton dashboard
-- Supabase : https://supabase.com/dashboard → SQL Editor
--

-- ─── Enable UUID extension ──────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. PROFILES (extends Supabase auth.users) ─────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  family_name TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  language TEXT NOT NULL DEFAULT 'fr',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, family_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'family_name', split_part(COALESCE(NEW.email, ''), '@', 1), '')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 2. CHILDREN ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scolaria_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  avatar_emoji TEXT NOT NULL DEFAULT '👦',
  birth_date DATE,
  age INTEGER,
  classe TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  super_power TEXT,
  super_power_emoji TEXT DEFAULT '⭐',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generate unique Scolaria ID
CREATE OR REPLACE FUNCTION generate_scolaria_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scolaria_id IS NULL OR NEW.scolaria_id = '' THEN
    NEW.scolaria_id := 'SCA-' || TO_CHAR(NOW(), 'YYYY') || '-FR-' ||
                       LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_scolaria_id ON children;
CREATE TRIGGER set_scolaria_id
  BEFORE INSERT ON children
  FOR EACH ROW EXECUTE FUNCTION generate_scolaria_id();

-- ─── 3. GRADES ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📚',
  color TEXT NOT NULL DEFAULT '#22D3EE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, name)
);

CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  value DECIMAL(4,2) NOT NULL,
  max_value DECIMAL(4,2) NOT NULL DEFAULT 20,
  class_avg DECIMAL(4,2),
  type TEXT NOT NULL DEFAULT 'Contrôle',
  comment TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  trimester INTEGER NOT NULL DEFAULT 1 CHECK (trimester BETWEEN 1 AND 3),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ocr', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grades_child ON grades(child_id);
CREATE INDEX idx_grades_subject ON grades(subject_id);
CREATE INDEX idx_grades_date ON grades(date DESC);

-- ─── 4. CHECK-INS (Mon Ressenti) ───────────────────────

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'primaire' CHECK (mode IN ('maternelle', 'primaire', 'lycee')),
  -- Maternelle: emoji only
  emotion TEXT,
  -- Primaire: emotion + sliders
  energy INTEGER CHECK (energy BETWEEN 0 AND 10),
  stress INTEGER CHECK (stress BETWEEN 0 AND 10),
  -- Lycée: additional sliders
  motivation INTEGER CHECK (motivation BETWEEN 0 AND 10),
  social INTEGER CHECK (social BETWEEN 0 AND 10),
  -- Shared
  joy_score INTEGER CHECK (joy_score BETWEEN 1 AND 10),
  message TEXT,
  is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkins_child ON checkins(child_id);
CREATE INDEX idx_checkins_date ON checkins(date DESC);

-- ─── 5. AGENDA ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agenda_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'cours'
    CHECK (event_type IN ('cours', 'devoir', 'examen', 'activite', 'reunion', 'sortie')),
  subject TEXT,
  emoji TEXT NOT NULL DEFAULT '📅',
  color TEXT NOT NULL DEFAULT '#22D3EE',
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agenda_child ON agenda_events(child_id);
CREATE INDEX idx_agenda_date ON agenda_events(start_time);

-- ─── 6. CONVERSATIONS ARIA ─────────────────────────────

CREATE TABLE IF NOT EXISTS aria_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aria_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES aria_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aria_messages_conv ON aria_messages(conversation_id);

-- ─── 7. ROW LEVEL SECURITY (RLS) ───────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE aria_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aria_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Children: parents can only see/manage their own children
CREATE POLICY children_select ON children FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY children_insert ON children FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY children_update ON children FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY children_delete ON children FOR DELETE USING (auth.uid() = parent_id);

-- Subjects: via parent → child relationship
CREATE POLICY subjects_select ON subjects FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY subjects_insert ON subjects FOR INSERT
  WITH CHECK (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- Grades: via parent → child relationship
CREATE POLICY grades_select ON grades FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY grades_insert ON grades FOR INSERT
  WITH CHECK (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY grades_update ON grades FOR UPDATE
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY grades_delete ON grades FOR DELETE
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- Checkins: via parent → child relationship
CREATE POLICY checkins_select ON checkins FOR SELECT
  USING (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY checkins_insert ON checkins FOR INSERT
  WITH CHECK (child_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- Agenda: parent owns events
CREATE POLICY agenda_select ON agenda_events FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY agenda_insert ON agenda_events FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY agenda_update ON agenda_events FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY agenda_delete ON agenda_events FOR DELETE USING (auth.uid() = parent_id);

-- Aria conversations: parent owns conversations
CREATE POLICY aria_conv_select ON aria_conversations FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY aria_conv_insert ON aria_conversations FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY aria_msg_select ON aria_messages FOR SELECT
  USING (conversation_id IN (SELECT id FROM aria_conversations WHERE parent_id = auth.uid()));
CREATE POLICY aria_msg_insert ON aria_messages FOR INSERT
  WITH CHECK (conversation_id IN (SELECT id FROM aria_conversations WHERE parent_id = auth.uid()));

-- ─── 8. UPDATED_AT TRIGGERS ────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_agenda_updated_at BEFORE UPDATE ON agenda_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_aria_conv_updated_at BEFORE UPDATE ON aria_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 9. VIEWS (computed averages) ──────────────────────

CREATE OR REPLACE VIEW subject_averages AS
SELECT
  s.id AS subject_id,
  s.child_id,
  s.name AS subject_name,
  s.emoji,
  s.color,
  ROUND(AVG(g.value)::numeric, 1) AS average,
  ROUND(AVG(g.class_avg)::numeric, 1) AS class_avg,
  COUNT(g.id) AS grade_count,
  MAX(g.date) AS last_grade_date
FROM subjects s
LEFT JOIN grades g ON g.subject_id = s.id
GROUP BY s.id, s.child_id, s.name, s.emoji, s.color;

CREATE OR REPLACE VIEW child_overview AS
SELECT
  c.id AS child_id,
  c.first_name,
  c.classe,
  c.school,
  ROUND(AVG(g.value)::numeric, 1) AS overall_avg,
  COUNT(DISTINCT s.id) AS subject_count,
  COUNT(g.id) AS total_grades,
  (
    SELECT ROUND(AVG(ck.joy_score)::numeric, 1)
    FROM checkins ck
    WHERE ck.child_id = c.id AND ck.date >= CURRENT_DATE - INTERVAL '7 days'
  ) AS weekly_joy_avg
FROM children c
LEFT JOIN subjects s ON s.child_id = c.id
LEFT JOIN grades g ON g.child_id = c.id
GROUP BY c.id, c.first_name, c.classe, c.school;
