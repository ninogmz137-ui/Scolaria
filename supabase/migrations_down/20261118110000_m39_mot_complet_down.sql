-- Inverse de M39 (mot complet). ATTENTION : supprime les questions, libellés et citations de mot créés
-- depuis M39 — les exporter avant (lecture seule) si on revient en arrière en production.
BEGIN;

REVOKE UPDATE (read) ON public.teacher_messages FROM authenticated;
GRANT UPDATE ON public.teacher_messages TO authenticated, anon;

DROP POLICY IF EXISTS fils_messages_insert ON public.teacher_messages;
CREATE POLICY fils_messages_insert ON public.teacher_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()) AND sender_role = public.role_dans_fil(conversation_id));
DROP INDEX IF EXISTS public.teacher_messages_mot_id_idx;
ALTER TABLE public.teacher_messages DROP COLUMN IF EXISTS mot_id;

-- Déclencheur des réponses : retour à la version d'avant M39 (types seulement, sans question).
CREATE OR REPLACE FUNCTION public.reponses_mot_controler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_mot public.mots_liaison%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.responsable_id IS NOT NULL AND NEW.responsable_id IS NULL
       AND NEW.mot_id = OLD.mot_id AND NEW.child_id = OLD.child_id
       AND NEW.autorisation IS NOT DISTINCT FROM OLD.autorisation
       AND NEW.participation IS NOT DISTINCT FROM OLD.participation THEN
      RETURN NEW;
    END IF;
    IF NEW.mot_id <> OLD.mot_id OR NEW.child_id <> OLD.child_id OR NEW.responsable_id IS DISTINCT FROM OLD.responsable_id THEN
      RAISE EXCEPTION 'seule la réponse peut être modifiée' USING ERRCODE = '42501';
    END IF;
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

ALTER TABLE public.mots_liaison
  DROP CONSTRAINT IF EXISTS mots_liaison_question_hors_autorisation,
  DROP CONSTRAINT IF EXISTS mots_liaison_question_libelle_check,
  DROP COLUMN IF EXISTS question_libelle,
  DROP COLUMN IF EXISTS question;

COMMIT;
