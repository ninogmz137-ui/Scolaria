-- M29 · Fils INDIVIDUELS avec l'enseignant d'un responsable qui part ou dont le compte est supprimé :
-- CONSERVÉS (décision du 2 oct 2026), accès coupé pour le partant, nom « Ancien responsable » côté enseignant.
--
-- Règle générale : SUPPRIMÉ = ce que personne d'autre ne détient (ajouts privés) ;
--                  CONSERVÉ = ce qu'un tiers détient aussi (foyer, enseignant).
--
--  · Départ d'un carnet (quitter_carnet, M28) : ses fils individuels pour cet enfant passent à
--    parent_id NULL + parent_name « Ancien responsable » : il n'y a plus accès (même s'il est réinvité plus
--    tard : il ne retrouve pas ses anciens fils), l'enseignant les garde.
--  · Suppression de compte (M25) : même traitement (au lieu de la suppression prévue par M25).
--  · Le verrou des fils (fils_verrou) interdisait tout changement de parent_id : exception d'anonymisation
--    (seul parent_id passe à NULL ; participants, enfant, portée, foyer inchangés).

-- Un fil individuel dont le responsable est parti n'a plus de parent_id : colonne parent_parti pour l'exprimer
-- (la contrainte exigeait un parent_id pour tout fil individuel).
ALTER TABLE public.teacher_conversations ADD COLUMN IF NOT EXISTS parent_parti boolean NOT NULL DEFAULT false;
ALTER TABLE public.teacher_conversations DROP CONSTRAINT IF EXISTS teacher_conversations_portee_coherente;
ALTER TABLE public.teacher_conversations ADD CONSTRAINT teacher_conversations_portee_coherente CHECK (
  (portee = 'foyer' AND foyer_id IS NOT NULL AND parent_id IS NULL AND NOT parent_parti)
  OR (portee = 'individuel' AND foyer_id IS NULL AND (parent_id IS NOT NULL OR parent_parti))
);

CREATE OR REPLACE FUNCTION public.fils_verrou()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'teacher_conversations' THEN
    -- Anonymisation du responsable parti : seul parent_id passe à NULL (+ parent_parti), et SEULEMENT si ce
    -- parent n'est plus responsable de l'enfant ou si son compte est en cours d'effacement (jamais à la main).
    IF OLD.parent_id IS NOT NULL AND NEW.parent_id IS NULL AND NEW.parent_parti
       AND NEW.teacher_id = OLD.teacher_id AND NEW.student_id = OLD.student_id AND NEW.portee = OLD.portee
       AND NEW.foyer_id IS NOT DISTINCT FROM OLD.foyer_id
       AND (NOT EXISTS (SELECT 1 FROM public.responsables r WHERE r.user_id = OLD.parent_id AND r.child_id = OLD.student_id)
            OR public.compte_en_effacement(OLD.parent_id)) THEN
      RETURN NEW;
    END IF;
    IF NEW.teacher_id <> OLD.teacher_id OR NEW.student_id <> OLD.student_id OR NEW.portee <> OLD.portee
       OR NEW.foyer_id IS DISTINCT FROM OLD.foyer_id OR NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      RAISE EXCEPTION 'les participants d''un fil ne peuvent pas être modifiés' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.conversation_id <> OLD.conversation_id OR NEW.sender_id <> OLD.sender_id OR NEW.sender_role <> OLD.sender_role
       OR NEW.text <> OLD.text OR NEW.envoi_id IS DISTINCT FROM OLD.envoi_id OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'un message ne peut pas être modifié' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Départ d'un responsable : ajouts privés supprimés, invitations annulées (M28), fils individuels conservés
-- sans son nom.
CREATE OR REPLACE FUNCTION public.supprimer_prives_au_depart()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.carnet_items
  WHERE child_id = OLD.child_id AND ajoute_par = OLD.user_id AND visibilite = 'prive';
  UPDATE public.invitations_responsable
  SET statut = 'annulee', responded_at = now()
  WHERE child_id = OLD.child_id AND invited_by = OLD.user_id AND statut = 'en_attente';
  UPDATE public.teacher_conversations
  SET parent_id = NULL, parent_parti = true, parent_name = 'Ancien responsable'
  WHERE portee = 'individuel' AND student_id = OLD.child_id AND parent_id = OLD.user_id;
  RETURN OLD;
END;
$function$;

-- Suppression de compte : fils individuels conservés (étape 4), le reste inchangé depuis M25.
CREATE OR REPLACE FUNCTION public.executer_effacement(p_demande_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  d public.demandes_effacement%ROWTYPE;
  v_enfants uuid[];
BEGIN
  SELECT * INTO d FROM public.demandes_effacement WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND OR d.annulee_le IS NOT NULL OR d.executee_le IS NOT NULL THEN
    RAISE EXCEPTION 'demande_non_executable' USING ERRCODE = 'no_data_found';
  END IF;
  IF d.execution_prevue_le > now() THEN
    RAISE EXCEPTION 'delai_non_ecoule' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT coalesce(array_agg(e), '{}') INTO v_enfants FROM public.enfants_a_effacer(p_demande_id) e;

  -- 1. Enfants effacés : ce qui ne part pas en cascade avec children (SET NULL / sans clé étrangère).
  DELETE FROM public.messages WHERE child_id = ANY (v_enfants);
  DELETE FROM public.alertes_urgence WHERE child_id = ANY (v_enfants);
  DELETE FROM public.teacher_conversations WHERE student_id = ANY (v_enfants);
  DELETE FROM public.transfer_codes WHERE child_id = ANY (v_enfants);
  DELETE FROM public.deletion_requests WHERE child_id = ANY (v_enfants);
  DELETE FROM public.children WHERE id = ANY (v_enfants);  -- cascade : années, carnet, notes, mots…

  IF d.portee = 'compte' THEN
    -- 2. Enfants GARDÉS (autre responsable) : children.parent_id (créateur, ON DELETE CASCADE) passe à un
    --    autre responsable, sinon la suppression du compte effacerait l'enfant.
    UPDATE public.children c SET parent_id = (
      SELECT r.user_id FROM public.responsables r
      WHERE r.child_id = c.id AND r.user_id <> d.user_id ORDER BY r.created_at LIMIT 1
    )
    WHERE c.parent_id = d.user_id
      AND EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = c.id AND r.user_id <> d.user_id);
    -- 3. Ajouts privés : supprimés (leurs fichiers l'ont été avant). Ajouts « foyer » : gardés, auteur
    --    effacé par la clé étrangère (SET NULL) à la suppression du compte. Fichiers gardés : propriétaire effacé.
    DELETE FROM public.carnet_items WHERE ajoute_par = d.user_id AND visibilite = 'prive';
    UPDATE storage.objects SET owner = NULL, owner_id = NULL
    WHERE bucket_id = 'carnet' AND owner_id = d.user_id::text;
    -- 4. Fils avec l'enseignant : CONSERVÉS (l'enseignant les détient aussi), sans le nom du responsable :
    --    individuels → parent_id NULL, « Ancien responsable » ; messages → auteur effacé.
    UPDATE public.teacher_conversations
    SET parent_id = NULL, parent_parti = true, parent_name = 'Ancien responsable'
    WHERE portee = 'individuel' AND parent_id = d.user_id;
    UPDATE public.teacher_messages SET sender_id = NULL WHERE sender_id = d.user_id;
    -- 5. Données du compte sans clé étrangère vers profiles.
    DELETE FROM public.class_post_reactions WHERE user_id = d.user_id;
    DELETE FROM public.class_post_seen WHERE parent_id = d.user_id;
    DELETE FROM public.access_journal WHERE family_id = d.user_id;
    DELETE FROM public.deletion_requests WHERE family_id = d.user_id;
    DELETE FROM public.export_history WHERE family_id = d.user_id;
    DELETE FROM public.person_permissions WHERE family_id = d.user_id;
    DELETE FROM public.transfer_codes WHERE family_id = d.user_id;
    DELETE FROM public.responsables WHERE user_id = d.user_id;
    -- Suppression du compte Auth ensuite : profil, réponses aux mots, Aria, agenda, départs… en cascade ;
    -- signatures et ajouts « foyer » gardés sans auteur (SET NULL).
  ELSE
    UPDATE public.demandes_effacement SET executee_le = now() WHERE id = p_demande_id;
  END IF;
END;
$function$;
