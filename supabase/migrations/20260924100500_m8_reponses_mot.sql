-- ════════════════════════════════════════════════════════════════════════════
-- M8 · Réponses aux mots (Phase A, lot 3a) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924100500_m8_reponses_mot_down.sql
--
--  - Mot « autorisation »  → autorisation oui/non (booléen)
--  - Mot « participation » → participation oui / peut_etre / non
--  - UNE réponse par (mot, enfant, responsable), modifiable par son auteur tant que le mot est envoyé.
--  - Le mot doit être dans le carnet de l'enfant (FK mot_carnets) ; année = celle du carnet.
--  - Visible des responsables de l'enfant et de l'enseignant auteur du mot.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.reponses_mot (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  mot_id uuid NOT NULL,
  child_id uuid NOT NULL,
  responsable_id uuid DEFAULT auth.uid() NOT NULL,
  academic_year_id uuid,
  autorisation boolean,
  participation text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT reponses_mot_pkey PRIMARY KEY (id),
  CONSTRAINT reponses_mot_unique_key UNIQUE (mot_id, child_id, responsable_id),
  CONSTRAINT reponses_mot_carnet_fkey FOREIGN KEY (mot_id, child_id)
    REFERENCES public.mot_carnets(mot_id, child_id) ON DELETE CASCADE,
  CONSTRAINT reponses_mot_responsable_fkey FOREIGN KEY (responsable_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT reponses_mot_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL,
  CONSTRAINT reponses_mot_participation_check CHECK (participation IS NULL OR participation = ANY (ARRAY['oui'::text, 'peut_etre'::text, 'non'::text])),
  CONSTRAINT reponses_mot_une_valeur_check CHECK ((autorisation IS NULL) <> (participation IS NULL))
);
CREATE INDEX idx_reponses_mot_child ON public.reponses_mot USING btree (child_id);
CREATE INDEX idx_reponses_mot_responsable ON public.reponses_mot USING btree (responsable_id);

-- Cohérence avec le type du mot + champs fixés côté serveur.
CREATE OR REPLACE FUNCTION public.reponses_mot_controler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_mot public.mots_liaison%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.mot_id <> OLD.mot_id OR NEW.child_id <> OLD.child_id OR NEW.responsable_id <> OLD.responsable_id) THEN
    RAISE EXCEPTION 'seule la réponse peut être modifiée' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_mot FROM public.mots_liaison WHERE id = NEW.mot_id;
  IF v_mot.statut IS DISTINCT FROM 'envoyé' THEN
    RAISE EXCEPTION 'ce mot n''accepte pas de réponse' USING ERRCODE = '23514';
  END IF;
  IF v_mot.type = 'autorisation' AND NEW.autorisation IS NULL THEN
    RAISE EXCEPTION 'un mot d''autorisation attend oui ou non' USING ERRCODE = '23514';
  ELSIF v_mot.type = 'participation' AND NEW.participation IS NULL THEN
    RAISE EXCEPTION 'un mot de participation attend oui, peut-être ou non' USING ERRCODE = '23514';
  ELSIF v_mot.type NOT IN ('autorisation', 'participation') THEN
    RAISE EXCEPTION 'ce type de mot n''attend pas de réponse' USING ERRCODE = '23514';
  END IF;

  SELECT mc.academic_year_id INTO NEW.academic_year_id
  FROM public.mot_carnets mc WHERE mc.mot_id = NEW.mot_id AND mc.child_id = NEW.child_id;
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.reponses_mot_controler() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reponses_mot_controler BEFORE INSERT OR UPDATE ON public.reponses_mot
  FOR EACH ROW EXECUTE FUNCTION public.reponses_mot_controler();

ALTER TABLE public.reponses_mot ENABLE ROW LEVEL SECURITY;
CREATE POLICY reponses_mot_select ON public.reponses_mot FOR SELECT TO authenticated
  USING (public.is_responsable(child_id) OR public.is_mot_teacher(mot_id));
CREATE POLICY reponses_mot_insert ON public.reponses_mot FOR INSERT TO authenticated
  WITH CHECK (responsable_id = auth.uid() AND public.is_responsable(child_id));
CREATE POLICY reponses_mot_update ON public.reponses_mot FOR UPDATE TO authenticated
  USING (responsable_id = auth.uid() AND public.is_responsable(child_id))
  WITH CHECK (responsable_id = auth.uid() AND public.is_responsable(child_id));
-- Pas de DELETE : on change sa réponse, on ne l'efface pas.
