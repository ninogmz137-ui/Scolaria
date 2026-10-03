-- M27 · Suppression d'un compte : réponses aux mots et événements d'agenda CONSERVÉS, sans auteur
-- (décision du 2 oct 2026, même principe que M25 : le carnet appartient à l'enfant ; partagé = conservé
-- anonymisé, privé = supprimé).
--
--   · réponses aux mots (autorisation / participation) : conservées, responsable_id → NULL
--     (« Répondu par un responsable (compte supprimé) »). Elles sont lisibles par tous les responsables du
--     carnet : aucune n'est privée.
--   · événements d'agenda : conservés, parent_id → NULL. L'agenda n'a AUCUNE notion de « privé » aujourd'hui
--     (agenda_select = tout responsable de l'enfant) : tous les événements sont partagés, aucun n'est supprimé.
--     Si un jour un événement « privé » est introduit, il devra être supprimé au départ de son auteur.
--
-- Le déclencheur de reponses_mot refuse toute mise à jour sur un mot non « envoyé » : sans exception, la
-- suppression d'un compte échouerait dès qu'il a répondu à un mot clos. L'anonymisation (responsable_id →
-- NULL, rien d'autre ne change) est donc autorisée, comme pour les signatures (M25).

ALTER TABLE public.reponses_mot ALTER COLUMN responsable_id DROP NOT NULL;
ALTER TABLE public.reponses_mot DROP CONSTRAINT reponses_mot_responsable_fkey;
ALTER TABLE public.reponses_mot ADD CONSTRAINT reponses_mot_responsable_fkey
  FOREIGN KEY (responsable_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.agenda_events ALTER COLUMN parent_id DROP NOT NULL;
ALTER TABLE public.agenda_events DROP CONSTRAINT agenda_events_parent_id_fkey;
ALTER TABLE public.agenda_events ADD CONSTRAINT agenda_events_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.reponses_mot_controler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_mot public.mots_liaison%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Anonymisation (suppression du compte du répondant) : seul responsable_id passe à NULL.
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
