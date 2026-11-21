-- ═══════════════════════════════════════════════════════════
-- SCOLARIA — Migration : Cahier de Liaison + Absences
-- ═══════════════════════════════════════════════════════════
--
-- Tables créées :
--   1. mots_liaison      — Messages enseignant → parents
--   2. signatures         — Signatures des parents sur les mots
--   3. read_receipts      — Accusés de lecture
--   4. absences           — Signalements d'absence (parent → enseignant)
--

-- ─── 1. MOTS DE LIAISON ────────────────────────────────────

CREATE TABLE IF NOT EXISTS mots_liaison (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classe TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'autorisation', 'bon_de_sortie')),
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  date_envoi DATE NOT NULL DEFAULT CURRENT_DATE,
  date_limite DATE,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoyé', 'clos')),
  requires_signature BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mots_liaison_teacher ON mots_liaison(teacher_id);
CREATE INDEX IF NOT EXISTS idx_mots_liaison_classe ON mots_liaison(classe);
CREATE INDEX IF NOT EXISTS idx_mots_liaison_created ON mots_liaison(created_at DESC);

-- ─── 2. SIGNATURES ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mot_id UUID NOT NULL REFERENCES mots_liaison(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  parent_name TEXT NOT NULL DEFAULT '',
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mot_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_signatures_mot ON signatures(mot_id);
CREATE INDEX IF NOT EXISTS idx_signatures_parent ON signatures(parent_id);

-- ─── 3. READ RECEIPTS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mot_id UUID NOT NULL REFERENCES mots_liaison(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mot_id, parent_id)
);

-- ─── 4. ABSENCES ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS absences (
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

CREATE INDEX IF NOT EXISTS idx_absences_student ON absences(student_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(date_debut DESC);
CREATE INDEX IF NOT EXISTS idx_absences_statut ON absences(statut);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

ALTER TABLE mots_liaison ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- ─── Mots de liaison ───────────────────────────────────────
-- Enseignant : CRUD sur ses propres mots
CREATE POLICY mots_teacher_select ON mots_liaison FOR SELECT
  USING (teacher_id = auth.uid());
CREATE POLICY mots_teacher_insert ON mots_liaison FOR INSERT
  WITH CHECK (teacher_id = auth.uid());
CREATE POLICY mots_teacher_update ON mots_liaison FOR UPDATE
  USING (teacher_id = auth.uid());
CREATE POLICY mots_teacher_delete ON mots_liaison FOR DELETE
  USING (teacher_id = auth.uid());

-- Parent : lecture des mots de la classe de ses enfants
CREATE POLICY mots_parent_select ON mots_liaison FOR SELECT
  USING (
    classe IN (
      SELECT c.classe FROM children c WHERE c.parent_id = auth.uid()
    )
  );

-- ─── Signatures ────────────────────────────────────────────
-- Parent : peut signer (INSERT) pour ses enfants
CREATE POLICY signatures_parent_insert ON signatures FOR INSERT
  WITH CHECK (
    parent_id = auth.uid()
    AND student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );

-- Parent : peut voir ses propres signatures
CREATE POLICY signatures_parent_select ON signatures FOR SELECT
  USING (parent_id = auth.uid());

-- Enseignant : peut voir les signatures de ses mots
CREATE POLICY signatures_teacher_select ON signatures FOR SELECT
  USING (
    mot_id IN (SELECT id FROM mots_liaison WHERE teacher_id = auth.uid())
  );

-- ─── Read receipts ─────────────────────────────────────────
CREATE POLICY read_receipts_owner ON read_receipts FOR ALL
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- ─── Absences ──────────────────────────────────────────────
-- Parent : CRUD sur les absences de ses enfants
CREATE POLICY absences_parent_select ON absences FOR SELECT
  USING (student_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));
CREATE POLICY absences_parent_insert ON absences FOR INSERT
  WITH CHECK (
    signalee_par = auth.uid()
    AND student_id IN (SELECT id FROM children WHERE parent_id = auth.uid())
  );
CREATE POLICY absences_parent_update ON absences FOR UPDATE
  USING (student_id IN (SELECT id FROM children WHERE parent_id = auth.uid()));

-- Enseignant : peut voir et mettre à jour les absences de sa classe
-- (Pour l'instant, un enseignant authentifié voit toutes les absences.
--  On affinera avec une table teacher_classes quand les classes seront modélisées.)
CREATE POLICY absences_teacher_select ON absences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.email LIKE '%prof%' OR p.email LIKE '%enseignant%'
    )
  );
CREATE POLICY absences_teacher_update ON absences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.email LIKE '%prof%' OR p.email LIKE '%enseignant%'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- VIEW : mots avec compteurs de signatures
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW mots_liaison_enriched AS
SELECT
  m.*,
  COALESCE(sig.cnt, 0)::INTEGER AS signatures_count,
  COALESCE(stu.cnt, 0)::INTEGER AS total_students
FROM mots_liaison m
LEFT JOIN (
  SELECT mot_id, COUNT(*)::INTEGER AS cnt
  FROM signatures
  GROUP BY mot_id
) sig ON sig.mot_id = m.id
LEFT JOIN (
  SELECT classe, COUNT(*)::INTEGER AS cnt
  FROM children
  GROUP BY classe
) stu ON stu.classe = m.classe;
