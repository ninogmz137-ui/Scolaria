-- ════════════════════════════════════════════════════════════════════════════
-- M5a · Écoles et classes identifiées par un id (Phase A, lot 3a) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924100100_m5a_classes_down.sql
--
-- Une classe = (école, année scolaire, nom) avec un id. JAMAIS rattachée par son nom seul :
-- deux « CE1 » de deux écoles sont deux classes distinctes.
--  - academic_years.classe_id : la classe de l'enfant pour cette année.
--  - mots_liaison / class_posts / class_events.classe_id : destinataire par id.
--  - Les colonnes texte `classe` restent (dépréciées, rendues facultatives) ; aucune policy ne les lit.
--  - classes.enseignant_id : l'enseignant titulaire ; lui seul peut distribuer un mot à la classe (M5).
-- Création des écoles / classes : serveur (interface enseignant, plus tard) — pas d'écriture utilisateur.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.ecoles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nom text NOT NULL,
  code_uai text,
  ville text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT ecoles_pkey PRIMARY KEY (id),
  CONSTRAINT ecoles_code_uai_key UNIQUE (code_uai)
);

CREATE TABLE public.classes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ecole_id uuid NOT NULL,
  annee_scolaire text NOT NULL,
  niveau text NOT NULL,
  nom text NOT NULL,
  enseignant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_ecole_annee_nom_key UNIQUE (ecole_id, annee_scolaire, nom),
  CONSTRAINT classes_ecole_id_fkey FOREIGN KEY (ecole_id) REFERENCES public.ecoles(id) ON DELETE CASCADE
);
CREATE INDEX idx_classes_ecole ON public.classes USING btree (ecole_id);
CREATE INDEX idx_classes_enseignant ON public.classes USING btree (enseignant_id);

-- ─── Rattachements par id ───────────────────────────────────────────────────
ALTER TABLE public.academic_years ADD COLUMN classe_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE public.mots_liaison   ADD COLUMN classe_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE public.class_posts    ADD COLUMN classe_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
ALTER TABLE public.class_events   ADD COLUMN classe_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
CREATE INDEX idx_academic_years_classe ON public.academic_years USING btree (classe_id);
CREATE INDEX idx_mots_liaison_classe_id ON public.mots_liaison USING btree (classe_id);
CREATE INDEX idx_class_posts_classe_id ON public.class_posts USING btree (classe_id);
CREATE INDEX idx_class_events_classe_id ON public.class_events USING btree (classe_id);

-- Le nom texte n'est plus obligatoire (déprécié).
ALTER TABLE public.mots_liaison ALTER COLUMN classe DROP NOT NULL;
ALTER TABLE public.class_posts  ALTER COLUMN classe DROP NOT NULL;
ALTER TABLE public.class_events ALTER COLUMN classe DROP NOT NULL;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.ecoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Un responsable voit les classes (et écoles) de ses enfants, toutes années confondues.
CREATE POLICY classes_select ON public.classes FOR SELECT TO authenticated
  USING (id IN (SELECT ay.classe_id FROM public.academic_years ay WHERE public.is_responsable(ay.student_id)));
CREATE POLICY ecoles_select ON public.ecoles FOR SELECT TO authenticated
  USING (id IN (SELECT c.ecole_id FROM public.classes c));

-- L'enseignant titulaire voit sa classe.
CREATE POLICY classes_enseignant_select ON public.classes FOR SELECT TO authenticated
  USING (enseignant_id = auth.uid());

-- Publications et événements de classe : par id de classe (plus par nom).
ALTER POLICY "Parents read class posts" ON public.class_posts
  USING (classe_id IN (SELECT ay.classe_id FROM public.academic_years ay WHERE public.is_responsable(ay.student_id)));
ALTER POLICY "Parents read events" ON public.class_events
  USING (classe_id IN (SELECT ay.classe_id FROM public.academic_years ay WHERE public.is_responsable(ay.student_id)));
