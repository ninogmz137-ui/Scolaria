-- ════════════════════════════════════════════════════════════════════════════
-- M9 · Compétences (Phase A, lot 3b) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924110000_m9_competences_down.sql
--
--  - Rattachées à child_id + academic_year_id ; niveau 1 à 4 (Non atteint · Partiellement · Atteint · Dépassé).
--  - source fixée par le SERVEUR selon l'auteur :
--      · enseignant titulaire de la classe de cette année → 'ecole'
--      · responsable de l'enfant (livret scanné, saisie famille) → 'parent'
--  - Compétence 'ecole' : modifiable / supprimable par le titulaire de la classe de l'année uniquement
--    (jamais par un parent, jamais par un autre enseignant).
--  - Compétence 'parent' : modifiable / supprimable par le responsable qui l'a saisie.
--  - Lecture : responsables de l'enfant (tout) ; titulaire (compétences 'ecole' de sa classe uniquement).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.competences (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  child_id uuid NOT NULL,
  academic_year_id uuid,
  domaine text NOT NULL,
  competence text NOT NULL,
  niveau smallint NOT NULL,
  observation text,
  source text NOT NULL,
  saisi_par uuid DEFAULT auth.uid() NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT competences_pkey PRIMARY KEY (id),
  CONSTRAINT competences_niveau_check CHECK (niveau BETWEEN 1 AND 4),
  CONSTRAINT competences_source_check CHECK (source = ANY (ARRAY['ecole'::text, 'parent'::text])),
  CONSTRAINT competences_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE,
  CONSTRAINT competences_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL,
  CONSTRAINT competences_saisi_par_fkey FOREIGN KEY (saisi_par) REFERENCES public.profiles(id) ON DELETE CASCADE
);
CREATE INDEX idx_competences_child ON public.competences USING btree (child_id);
CREATE INDEX idx_competences_year ON public.competences USING btree (academic_year_id);
CREATE INDEX idx_competences_saisi_par ON public.competences USING btree (saisi_par);

-- L'utilisateur connecté est-il titulaire de la classe de cette année scolaire ?
CREATE OR REPLACE FUNCTION public.is_titulaire_annee(p_academic_year_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.academic_years ay JOIN public.classes c ON c.id = ay.classe_id
    WHERE ay.id = p_academic_year_id AND c.enseignant_id = auth.uid()
  );
$function$;
REVOKE EXECUTE ON FUNCTION public.is_titulaire_annee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_titulaire_annee(uuid) TO authenticated;

CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.competences
  FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');

-- Source et auteur fixés par le serveur ; enfant, année, source et auteur non modifiables.
-- (nommé après « set_academic_year » : l'année est déjà connue quand la source est calculée)
CREATE OR REPLACE FUNCTION public.set_source_competence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.child_id <> OLD.child_id OR NEW.academic_year_id IS DISTINCT FROM OLD.academic_year_id
       OR NEW.source <> OLD.source OR NEW.saisi_par <> OLD.saisi_par THEN
      RAISE EXCEPTION 'enfant, année, source et auteur d''une compétence ne sont pas modifiables' USING ERRCODE = '42501';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Appels via l'API uniquement ; service_role / postgres gardent la main (imports serveur).
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.saisi_par := auth.uid();
    IF public.is_titulaire_annee(NEW.academic_year_id) THEN
      NEW.source := 'ecole';
    ELSIF public.is_responsable(NEW.child_id) THEN
      NEW.source := 'parent';
    ELSE
      RAISE EXCEPTION 'ni responsable de l''enfant, ni titulaire de sa classe' USING ERRCODE = '42501';
    END IF;
  END IF;
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.set_source_competence() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER set_source_competence BEFORE INSERT OR UPDATE ON public.competences
  FOR EACH ROW EXECUTE FUNCTION public.set_source_competence();

ALTER TABLE public.competences ENABLE ROW LEVEL SECURITY;
CREATE POLICY competences_select ON public.competences FOR SELECT TO authenticated
  USING (public.is_responsable(child_id) OR (source = 'ecole' AND public.is_titulaire_annee(academic_year_id)));
CREATE POLICY competences_insert ON public.competences FOR INSERT TO authenticated
  WITH CHECK (
    (source = 'ecole' AND public.is_titulaire_annee(academic_year_id))
    OR (source = 'parent' AND saisi_par = auth.uid() AND public.is_responsable(child_id))
  );
CREATE POLICY competences_update ON public.competences FOR UPDATE TO authenticated
  USING (
    (source = 'ecole' AND public.is_titulaire_annee(academic_year_id))
    OR (source = 'parent' AND saisi_par = auth.uid() AND public.is_responsable(child_id))
  )
  WITH CHECK (
    (source = 'ecole' AND public.is_titulaire_annee(academic_year_id))
    OR (source = 'parent' AND saisi_par = auth.uid() AND public.is_responsable(child_id))
  );
CREATE POLICY competences_delete ON public.competences FOR DELETE TO authenticated
  USING (
    (source = 'ecole' AND public.is_titulaire_annee(academic_year_id))
    OR (source = 'parent' AND saisi_par = auth.uid() AND public.is_responsable(child_id))
  );
