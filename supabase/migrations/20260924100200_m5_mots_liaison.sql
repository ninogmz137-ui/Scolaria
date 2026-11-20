-- ════════════════════════════════════════════════════════════════════════════
-- M5 · Mots de liaison : un mot = une copie dans le carnet de chaque enfant (Phase A, lot 3a) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924100200_m5_mots_liaison_down.sql
--
--  - type : information | signature | autorisation | participation
--    (ancien : info → information, bon_de_sortie → autorisation ; table vide au moment de la migration)
--  - signature_mode : none | one | both. requires_signature est conservé (déprécié), recalculé par trigger.
--  - event_date (date + heure saisies par l'enseignant), a_prevoir (liste jsonb, facultative).
--  - mot_carnets : UNE ligne par (mot, enfant), rattachée à child_id + academic_year_id.
--    · Mot à une classe (classe_id, statut « envoyé ») : copie dans le carnet de chaque enfant dont
--      l'année scolaire est dans cette classe. Seul l'enseignant titulaire de la classe peut l'envoyer.
--    · Mot à une fratrie / à des enfants précis : distribuer_mot(mot, enfants[]) = une copie par enfant.
--  - Un parent lit un mot UNIQUEMENT via le carnet de son enfant (plus par nom de classe).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Colonnes du mot ─────────────────────────────────────────────────────
ALTER TABLE public.mots_liaison DROP CONSTRAINT mots_liaison_type_check;
UPDATE public.mots_liaison SET type = CASE type WHEN 'info' THEN 'information' WHEN 'bon_de_sortie' THEN 'autorisation' ELSE type END;
ALTER TABLE public.mots_liaison ADD CONSTRAINT mots_liaison_type_check
  CHECK (type = ANY (ARRAY['information'::text, 'signature'::text, 'autorisation'::text, 'participation'::text]));

ALTER TABLE public.mots_liaison
  ADD COLUMN signature_mode text DEFAULT 'none'::text NOT NULL,
  ADD COLUMN event_date timestamp with time zone,
  ADD COLUMN a_prevoir jsonb;
UPDATE public.mots_liaison SET signature_mode = CASE WHEN requires_signature THEN 'one' ELSE 'none' END;
ALTER TABLE public.mots_liaison
  ADD CONSTRAINT mots_liaison_signature_mode_check CHECK (signature_mode = ANY (ARRAY['none'::text, 'one'::text, 'both'::text])),
  ADD CONSTRAINT mots_liaison_a_prevoir_check CHECK (a_prevoir IS NULL OR jsonb_typeof(a_prevoir) = 'array');

-- requires_signature (déprécié) suit signature_mode.
CREATE OR REPLACE FUNCTION public.sync_requires_signature()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.requires_signature := NEW.signature_mode <> 'none';
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.sync_requires_signature() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_requires_signature BEFORE INSERT OR UPDATE ON public.mots_liaison
  FOR EACH ROW EXECUTE FUNCTION public.sync_requires_signature();

-- ─── 2. Le mot dans le carnet de chaque enfant ──────────────────────────────
CREATE TABLE public.mot_carnets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  mot_id uuid NOT NULL,
  child_id uuid NOT NULL,
  academic_year_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT mot_carnets_pkey PRIMARY KEY (id),
  CONSTRAINT mot_carnets_mot_child_key UNIQUE (mot_id, child_id),
  CONSTRAINT mot_carnets_mot_id_fkey FOREIGN KEY (mot_id) REFERENCES public.mots_liaison(id) ON DELETE CASCADE,
  CONSTRAINT mot_carnets_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE,
  CONSTRAINT mot_carnets_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL
);
CREATE INDEX idx_mot_carnets_child ON public.mot_carnets USING btree (child_id);
CREATE INDEX idx_mot_carnets_year ON public.mot_carnets USING btree (academic_year_id);
CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.mot_carnets
  FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');

-- L'utilisateur connecté est-il l'auteur (enseignant) de ce mot ? (évite la récursion RLS mots ↔ carnets)
CREATE OR REPLACE FUNCTION public.is_mot_teacher(p_mot_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.mots_liaison m WHERE m.id = p_mot_id AND m.teacher_id = auth.uid());
$function$;
REVOKE EXECUTE ON FUNCTION public.is_mot_teacher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mot_teacher(uuid) TO authenticated;

ALTER TABLE public.mot_carnets ENABLE ROW LEVEL SECURITY;
-- Lecture : responsables de l'enfant, ou enseignant auteur du mot. Écriture : serveur uniquement.
CREATE POLICY mot_carnets_select ON public.mot_carnets FOR SELECT TO authenticated
  USING (public.is_responsable(child_id) OR public.is_mot_teacher(mot_id));

-- ─── 3. Distribution ────────────────────────────────────────────────────────
-- Mot envoyé à une classe : une copie par enfant de la classe (année rattachée à classe_id).
CREATE OR REPLACE FUNCTION public.distribuer_mot_classe()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.statut <> 'envoyé' OR NEW.classe_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = NEW.classe_id AND c.enseignant_id = NEW.teacher_id) THEN
    RAISE EXCEPTION 'seul l''enseignant titulaire de la classe peut lui envoyer un mot' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.mot_carnets (mot_id, child_id, academic_year_id)
  SELECT NEW.id, ay.student_id, ay.id
  FROM public.academic_years ay
  WHERE ay.classe_id = NEW.classe_id
  ON CONFLICT (mot_id, child_id) DO NOTHING;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.distribuer_mot_classe() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER distribuer_mot_classe AFTER INSERT OR UPDATE OF statut, classe_id ON public.mots_liaison
  FOR EACH ROW EXECUTE FUNCTION public.distribuer_mot_classe();

-- Mot à une fratrie ou à des enfants précis : une copie par enfant.
-- Appelant = auteur du mot, enfants = élèves (année active) d'une classe dont il est titulaire.
CREATE OR REPLACE FUNCTION public.distribuer_mot(p_mot_id uuid, p_child_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_n integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.mots_liaison m WHERE m.id = p_mot_id AND m.teacher_id = auth.uid() AND m.statut = 'envoyé'
  ) THEN
    RAISE EXCEPTION 'mot introuvable, non envoyé ou d''un autre enseignant' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_child_ids) AS k(child_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.academic_years ay JOIN public.classes c ON c.id = ay.classe_id
      WHERE ay.student_id = k.child_id AND ay.statut = 'active' AND c.enseignant_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'un des enfants n''est pas élève de vos classes' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.mot_carnets (mot_id, child_id, academic_year_id)
  SELECT p_mot_id, ay.student_id, ay.id
  FROM public.academic_years ay JOIN public.classes c ON c.id = ay.classe_id
  WHERE ay.student_id = ANY (p_child_ids) AND ay.statut = 'active' AND c.enseignant_id = auth.uid()
  ON CONFLICT (mot_id, child_id) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.distribuer_mot(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.distribuer_mot(uuid, uuid[]) TO authenticated;

-- ─── 4. Lecture parent : via le carnet de l'enfant uniquement ───────────────
ALTER POLICY mots_parent_select ON public.mots_liaison
  USING (
    statut <> 'brouillon'
    AND id IN (SELECT mc.mot_id FROM public.mot_carnets mc WHERE public.is_responsable(mc.child_id))
  );

-- ─── 5. Vue enrichie (côté enseignant) : recalculée depuis les carnets ──────
-- signatures_count = nombre de carnets où le mot est signé (voir M6), total_students = nombre de carnets.
DROP VIEW public.mots_liaison_enriched;
CREATE VIEW public.mots_liaison_enriched WITH (security_invoker = true) AS
 SELECT m.id,
    m.teacher_id,
    m.classe,
    m.type,
    m.titre,
    m.contenu,
    m.date_envoi,
    m.date_limite,
    m.statut,
    m.requires_signature,
    m.created_at,
    0 AS signatures_count,
    COALESCE(mc.cnt, 0) AS total_students,
    m.classe_id,
    m.signature_mode,
    m.event_date,
    m.a_prevoir
   FROM public.mots_liaison m
     LEFT JOIN ( SELECT mot_carnets.mot_id, (count(*))::integer AS cnt
           FROM public.mot_carnets
          GROUP BY mot_carnets.mot_id) mc ON mc.mot_id = m.id;
REVOKE ALL ON public.mots_liaison_enriched FROM anon;
