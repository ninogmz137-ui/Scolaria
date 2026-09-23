-- ═══════════════════════════════════════════════════════════
-- SCOLARIA — Schema complet
-- Exécuter dans : https://supabase.com/dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. EXTENSIONS & FONCTIONS
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, family_name, first_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'family_name',
      SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

-- 2. TABLES
-- ═══════════════════════════════════════════════════════════

-- profiles
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  family_name TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'parent'
    CHECK (role IN ('parent', 'enseignant', 'eleve', 'enfant')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  language TEXT NOT NULL DEFAULT 'fr',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- children
DROP TABLE IF EXISTS public.children CASCADE;
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scolaria_id TEXT NOT NULL DEFAULT '',
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

-- unique constraint on scolaria_id
DO $$ BEGIN
  ALTER TABLE public.children ADD CONSTRAINT uq_children_scolaria_id UNIQUE (scolaria_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS set_scolaria_id ON children;
CREATE TRIGGER set_scolaria_id
  BEFORE INSERT ON children
  FOR EACH ROW EXECUTE FUNCTION generate_scolaria_id();

-- subjects
DROP TABLE IF EXISTS public.subjects CASCADE;
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22D3EE',
  classe TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, name)
);

-- grades
DROP TABLE IF EXISTS public.grades CASCADE;
CREATE TABLE public.grades (
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
  coefficient DECIMAL(3,1) NOT NULL DEFAULT 1,
  appreciation TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ocr', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- checkins
DROP TABLE IF EXISTS public.checkins CASCADE;
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'primaire'
    CHECK (mode IN ('maternelle', 'primaire', 'lycee')),
  emotion TEXT,
  energy INTEGER CHECK (energy BETWEEN 0 AND 10),
  stress INTEGER CHECK (stress BETWEEN 0 AND 10),
  motivation INTEGER CHECK (motivation BETWEEN 0 AND 10),
  social INTEGER CHECK (social BETWEEN 0 AND 10),
  joy_score INTEGER CHECK (joy_score BETWEEN 1 AND 10),
  message TEXT,
  is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- agenda_events
DROP TABLE IF EXISTS public.agenda_events CASCADE;
CREATE TABLE public.agenda_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'cours'
    CHECK (event_type IN ('cours', 'devoir', 'examen', 'activite', 'reunion', 'sortie')),
  subject TEXT,
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

-- aria_conversations
DROP TABLE IF EXISTS public.aria_conversations CASCADE;
CREATE TABLE public.aria_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- aria_messages
DROP TABLE IF EXISTS public.aria_messages CASCADE;
CREATE TABLE public.aria_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES aria_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  action_tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- academic_years
DROP TABLE IF EXISTS public.academic_years CASCADE;
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  annee_scolaire TEXT NOT NULL,
  niveau TEXT NOT NULL,
  etablissement TEXT,
  classe TEXT,
  statut TEXT NOT NULL DEFAULT 'active'
    CHECK (statut IN ('active', 'archivée', 'importée')),
  score_joie_moyen DECIMAL(3,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- bulletins
DROP TABLE IF EXISTS public.bulletins CASCADE;
CREATE TABLE public.bulletins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'Trimestre 1'
    CHECK (period IN ('Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Annuel')),
  content JSONB NOT NULL DEFAULT '[]',
  overall_avg DECIMAL(4,2),
  teacher_appreciation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, academic_year_id, period)
);

-- messages
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  thread_id UUID,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'message'
    CHECK (type IN ('message', 'absence_notification', 'info_classe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages
  ADD CONSTRAINT fk_messages_thread
  FOREIGN KEY (thread_id) REFERENCES messages(id) ON DELETE SET NULL;

-- mots_liaison
DROP TABLE IF EXISTS public.mots_liaison CASCADE;
CREATE TABLE public.mots_liaison (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classe TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'autorisation', 'bon_de_sortie')),
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  date_envoi DATE NOT NULL DEFAULT CURRENT_DATE,
  date_limite DATE,
  statut TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon', 'envoyé', 'clos')),
  requires_signature BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- signatures
DROP TABLE IF EXISTS public.signatures CASCADE;
CREATE TABLE public.signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mot_id UUID NOT NULL REFERENCES mots_liaison(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  parent_name TEXT NOT NULL DEFAULT '',
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mot_id, student_id)
);

-- read_receipts
DROP TABLE IF EXISTS public.read_receipts CASCADE;
CREATE TABLE public.read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mot_id UUID NOT NULL REFERENCES mots_liaison(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mot_id, parent_id)
);

-- absences
DROP TABLE IF EXISTS public.absences CASCADE;
CREATE TABLE public.absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  student_avatar TEXT NOT NULL DEFAULT '👦',
  academic_year_id TEXT NOT NULL DEFAULT '',
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin DATE,
  demi_journee TEXT NOT NULL DEFAULT 'journee'
    CHECK (demi_journee IN ('matin', 'apres_midi', 'journee')),
  motif TEXT NOT NULL DEFAULT 'autre'
    CHECK (motif IN ('maladie', 'maladie_avec_certificat', 'raison_familiale', 'autre')),
  commentaire TEXT,
  statut TEXT NOT NULL DEFAULT 'signalée'
    CHECK (statut IN ('signalée', 'prise_en_compte')),
  signalee_par UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_classe ON children(classe);
CREATE INDEX IF NOT EXISTS idx_subjects_child ON subjects(child_id);
CREATE INDEX IF NOT EXISTS idx_grades_child ON grades(child_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_date ON grades(date DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_child ON checkins(child_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date DESC);
CREATE INDEX IF NOT EXISTS idx_agenda_child ON agenda_events(child_id);
CREATE INDEX IF NOT EXISTS idx_agenda_date ON agenda_events(start_time);
CREATE INDEX IF NOT EXISTS idx_aria_conv_parent ON aria_conversations(parent_id);
CREATE INDEX IF NOT EXISTS idx_aria_messages_conv ON aria_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_student ON academic_years(student_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_child ON bulletins(child_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_academic_year ON bulletins(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date DESC);
CREATE INDEX IF NOT EXISTS idx_mots_liaison_teacher ON mots_liaison(teacher_id);
CREATE INDEX IF NOT EXISTS idx_mots_liaison_classe ON mots_liaison(classe);
CREATE INDEX IF NOT EXISTS idx_signatures_mot ON signatures(mot_id);
CREATE INDEX IF NOT EXISTS idx_absences_student ON absences(student_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(date_debut DESC);

-- 4. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE aria_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aria_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mots_liaison ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Children (parents + teachers can see)
CREATE POLICY children_select ON children FOR SELECT USING (
  auth.uid() = parent_id
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'enseignant')
);
CREATE POLICY children_insert ON children FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY children_update ON children FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY children_delete ON children FOR DELETE USING (auth.uid() = parent_id);

-- Subjects
CREATE POLICY subjects_select ON subjects FOR SELECT USING (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'enseignant')
);
CREATE POLICY subjects_insert ON subjects FOR INSERT WITH CHECK (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY subjects_update ON subjects FOR UPDATE USING (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);

-- Grades
CREATE POLICY grades_select ON grades FOR SELECT USING (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'enseignant')
);
CREATE POLICY grades_insert ON grades FOR INSERT WITH CHECK (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'enseignant')
);
CREATE POLICY grades_update ON grades FOR UPDATE USING (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'enseignant')
);
CREATE POLICY grades_delete ON grades FOR DELETE USING (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'enseignant')
);

-- Check-ins
CREATE POLICY checkins_select ON checkins FOR SELECT USING (
  child_id IN (SELECT child_id FROM children c JOIN profiles p ON c.parent_id = auth.uid()
    UNION ALL SELECT child_id FROM children WHERE auth.uid() IN (
      SELECT p.id FROM profiles p WHERE p.role = 'enseignant'
    )
  )
);
CREATE POLICY checkins_insert ON checkins FOR INSERT WITH CHECK (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);

-- Agenda
CREATE POLICY agenda_select ON agenda_events FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY agenda_insert ON agenda_events FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY agenda_update ON agenda_events FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY agenda_delete ON agenda_events FOR DELETE USING (auth.uid() = parent_id);

-- Aria conversations
CREATE POLICY aria_conv_select ON aria_conversations FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY aria_conv_insert ON aria_conversations FOR INSERT WITH CHECK (auth.uid() = parent_id);

-- Aria messages
CREATE POLICY aria_msg_select ON aria_messages FOR SELECT USING (
  conversation_id IN (SELECT id FROM aria_conversations WHERE parent_id = auth.uid())
);
CREATE POLICY aria_msg_insert ON aria_messages FOR INSERT WITH CHECK (
  conversation_id IN (SELECT id FROM aria_conversations WHERE parent_id = auth.uid())
);

-- Academic years
CREATE POLICY academic_years_select ON academic_years FOR SELECT USING (
  student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY academic_years_insert ON academic_years FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY academic_years_update ON academic_years FOR UPDATE USING (
  student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY academic_years_delete ON academic_years FOR DELETE USING (
  student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);

-- Bulletins
CREATE POLICY bulletins_select ON bulletins FOR SELECT USING (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY bulletins_insert ON bulletins FOR INSERT WITH CHECK (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY bulletins_update ON bulletins FOR UPDATE USING (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY bulletins_delete ON bulletins FOR DELETE USING (
  child_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);

-- Messages
CREATE POLICY messages_select ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY messages_update ON messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Mots de liaison (teacher)
CREATE POLICY mots_teacher_select ON mots_liaison FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY mots_teacher_insert ON mots_liaison FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY mots_teacher_update ON mots_liaison FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY mots_teacher_delete ON mots_liaison FOR DELETE USING (teacher_id = auth.uid());
CREATE POLICY mots_parent_select ON mots_liaison FOR SELECT USING (
  classe IN (SELECT c.classe FROM children c WHERE c.parent_id = auth.uid())
);

-- Signatures
CREATE POLICY sig_parent_insert ON signatures FOR INSERT WITH CHECK (
  parent_id = auth.uid() AND student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY sig_parent_select ON signatures FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY sig_teacher_select ON signatures FOR SELECT USING (
  mot_id IN (SELECT id FROM mots_liaison WHERE teacher_id = auth.uid())
);

-- Read receipts
CREATE POLICY rr_owner ON read_receipts FOR ALL USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());

-- Absences (parent)
CREATE POLICY absences_parent_select ON absences FOR SELECT USING (
  student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY absences_parent_insert ON absences FOR INSERT WITH CHECK (
  signalee_par = auth.uid() AND student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);
CREATE POLICY absences_parent_update ON absences FOR UPDATE USING (
  student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
);

-- Absences (teacher)
CREATE POLICY absences_teacher_select ON absences FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'enseignant')
);
CREATE POLICY absences_teacher_update ON absences FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'enseignant')
);

-- 5. TRIGGERS updated_at
-- ═══════════════════════════════════════════════════════════

CREATE TRIGGER upd_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_agenda_updated_at BEFORE UPDATE ON agenda_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_aria_conv_updated_at BEFORE UPDATE ON aria_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_academic_years_updated_at BEFORE UPDATE ON academic_years FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_bulletins_updated_at BEFORE UPDATE ON bulletins FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. VIEWS
-- ═══════════════════════════════════════════════════════════

CREATE VIEW subject_averages AS
SELECT
  s.id AS subject_id,
  s.child_id,
  s.name AS subject_name,
  s.color,
  ROUND(AVG(g.value)::numeric, 1) AS average,
  ROUND(AVG(g.class_avg)::numeric, 1) AS class_avg,
  COUNT(g.id) AS grade_count,
  MAX(g.date) AS last_grade_date
FROM subjects s
LEFT JOIN grades g ON g.subject_id = s.id
GROUP BY s.id, s.child_id, s.name, s.color;

CREATE VIEW child_overview AS
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

CREATE VIEW mots_liaison_enriched AS
SELECT
  m.*,
  COALESCE(sig.cnt, 0)::INTEGER AS signatures_count,
  COALESCE(stu.cnt, 0)::INTEGER AS total_students
FROM mots_liaison m
LEFT JOIN (
  SELECT mot_id, COUNT(*)::INTEGER AS cnt FROM signatures GROUP BY mot_id
) sig ON sig.mot_id = m.id
LEFT JOIN (
  SELECT classe, COUNT(*)::INTEGER AS cnt FROM children GROUP BY classe
) stu ON stu.classe = m.classe;
