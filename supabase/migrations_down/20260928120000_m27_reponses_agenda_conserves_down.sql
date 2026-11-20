-- Inverse de M27 : retour aux cascades d'origine (réponses et événements supprimés avec le compte).
-- ÉCHOUE volontairement s'il existe déjà des lignes sans auteur (comptes supprimés après M27) : décider
-- d'abord quoi en faire (les supprimer ou les rattacher).
ALTER TABLE public.agenda_events DROP CONSTRAINT agenda_events_parent_id_fkey;
ALTER TABLE public.agenda_events ADD CONSTRAINT agenda_events_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.agenda_events ALTER COLUMN parent_id SET NOT NULL;

ALTER TABLE public.reponses_mot DROP CONSTRAINT reponses_mot_responsable_fkey;
ALTER TABLE public.reponses_mot ADD CONSTRAINT reponses_mot_responsable_fkey
  FOREIGN KEY (responsable_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reponses_mot ALTER COLUMN responsable_id SET NOT NULL;

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
