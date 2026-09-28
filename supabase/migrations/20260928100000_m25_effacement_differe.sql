-- M25 · Droit à l'effacement DIFFÉRÉ (L7, décision D6 du 27 sept 2026).
--
-- Règle : la demande est exécutée 30 jours plus tard et reste annulable jusque-là, MAIS dès la demande :
--   · effacement d'un enfant  → le carnet disparaît pour tout le monde côté famille (is_responsable = faux) ;
--   · effacement du compte    → le compte ne voit plus aucun carnet (is_responsable / est_du_foyer = faux),
--                               ses ajouts au carnet ne sont plus visibles par l'autre responsable,
--                               ses conversations Aria ne sont plus lisibles.
-- La demande et son annulation passent UNIQUEMENT par des fonctions (aucune écriture directe).
-- L'exécution (fichiers du bucket, lignes, compte Auth) est faite par l'Edge Function « executer-effacements »
-- avec la clé service : les fonctions d'exécution ne sont accordées qu'à service_role.
--
-- Suppression directe d'un enfant (policy children_delete, M2e) RETIRÉE : elle effaçait sur-le-champ, sans
-- délai ni fichiers du bucket. Elle passe désormais par demander_effacement_enfant().
--
-- Suppression d'un COMPTE (décision du 28 sept 2026, principe : le carnet appartient à l'enfant) :
--   · ajouts « foyer » au carnet d'un enfant gardé : CONSERVÉS, auteur effacé (ajoute_par NULL →
--     « Ajouté par un ancien responsable ») ; ajouts « privés » : supprimés avec leurs fichiers ;
--   · signatures : CONSERVÉES, signataire effacé (parent_id NULL, « Responsable (compte supprimé) »),
--     date gardée : un mot signé ne repasse jamais « à signer » ;
--   · messages du fil famille : CONSERVÉS, auteur effacé (sender_id NULL → « Ancien responsable ») ;
--     fils individuels avec l'enseignant : supprimés.
--   Pendant les 30 jours, ses ajouts « foyer » restent visibles pour l'autre responsable (ils seront gardés).
--
-- Registre : une demande exécutée garde ses identifiants et ses dates (aucun nom, aucun texte), comme preuve
-- de l'effacement. Pas de clé étrangère : l'enfant et le compte n'existent plus après exécution.

-- ─── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE public.demandes_effacement (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portee               text NOT NULL CHECK (portee IN ('enfant', 'compte')),
  child_id             uuid,
  user_id              uuid NOT NULL,
  demandee_le          timestamptz NOT NULL DEFAULT now(),
  execution_prevue_le  timestamptz NOT NULL DEFAULT now() + interval '30 days',
  annulee_le           timestamptz,
  executee_le          timestamptz,
  CHECK ((portee = 'enfant') = (child_id IS NOT NULL))
);

-- Une seule demande en attente par enfant, et par compte.
CREATE UNIQUE INDEX demandes_effacement_enfant_en_attente
  ON public.demandes_effacement (child_id)
  WHERE portee = 'enfant' AND annulee_le IS NULL AND executee_le IS NULL;
CREATE UNIQUE INDEX demandes_effacement_compte_en_attente
  ON public.demandes_effacement (user_id)
  WHERE portee = 'compte' AND annulee_le IS NULL AND executee_le IS NULL;
CREATE INDEX demandes_effacement_user ON public.demandes_effacement (user_id);

ALTER TABLE public.demandes_effacement ENABLE ROW LEVEL SECURITY;
-- Lecture de SES demandes seulement ; aucune écriture directe (fonctions ci-dessous).
CREATE POLICY demandes_effacement_select ON public.demandes_effacement
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.demandes_effacement FROM anon, authenticated;

-- ─── Ce qui survit à la suppression d'un compte ──────────────────────────────
ALTER TABLE public.carnet_items ALTER COLUMN ajoute_par DROP NOT NULL;
ALTER TABLE public.carnet_items DROP CONSTRAINT carnet_items_ajoute_par_fkey;
ALTER TABLE public.carnet_items ADD CONSTRAINT carnet_items_ajoute_par_fkey
  FOREIGN KEY (ajoute_par) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.signatures ALTER COLUMN parent_id DROP NOT NULL;
ALTER TABLE public.signatures DROP CONSTRAINT signatures_parent_id_fkey;
ALTER TABLE public.signatures ADD CONSTRAINT signatures_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.teacher_messages ALTER COLUMN sender_id DROP NOT NULL;

-- Une signature reste non modifiable, SAUF l'effacement de son signataire (compte supprimé) : le nom est
-- alors remplacé, la date et le mot restent.
CREATE OR REPLACE FUNCTION public.signatures_remplir()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_mot public.mots_liaison%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.parent_id IS NOT NULL AND NEW.parent_id IS NULL
       AND NEW.id = OLD.id AND NEW.mot_id = OLD.mot_id AND NEW.student_id = OLD.student_id
       AND NEW.signed_at = OLD.signed_at THEN
      NEW.parent_name := 'Responsable (compte supprimé)';
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'une signature ne peut pas être modifiée' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_mot FROM public.mots_liaison WHERE id = NEW.mot_id;
  IF v_mot.statut IS DISTINCT FROM 'envoyé' THEN
    RAISE EXCEPTION 'ce mot n''est pas ouvert à la signature' USING ERRCODE = '23514';
  END IF;
  IF v_mot.signature_mode = 'none' THEN
    RAISE EXCEPTION 'ce mot ne demande pas de signature' USING ERRCODE = '23514';
  END IF;

  SELECT btrim(p.first_name || ' ' || p.family_name) INTO NEW.parent_name FROM public.profiles p WHERE p.id = NEW.parent_id;
  NEW.parent_name := COALESCE(NEW.parent_name, '');
  SELECT c.first_name INTO NEW.student_name FROM public.children c WHERE c.id = NEW.student_id;
  NEW.student_name := COALESCE(NEW.student_name, '');
  NEW.signed_at := now();
  SELECT mc.academic_year_id INTO NEW.academic_year_id
  FROM public.mot_carnets mc WHERE mc.mot_id = NEW.mot_id AND mc.child_id = NEW.student_id;
  RETURN NEW;
END;
$function$;

-- ─── Accès coupés dès la demande ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compte_en_effacement(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.demandes_effacement d
    WHERE d.portee = 'compte' AND d.user_id = p_user_id AND d.annulee_le IS NULL AND d.executee_le IS NULL
  );
$function$;

CREATE OR REPLACE FUNCTION public.enfant_en_effacement(p_child_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.demandes_effacement d
    WHERE d.portee = 'enfant' AND d.child_id = p_child_id AND d.annulee_le IS NULL AND d.executee_le IS NULL
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.compte_en_effacement(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enfant_en_effacement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compte_en_effacement(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enfant_en_effacement(uuid) TO authenticated, service_role;

-- is_responsable / est_du_foyer : faux si l'enfant OU le compte appelant est en cours d'effacement.
-- (37 policies passent par is_responsable : lecture et écriture coupées d'un coup.)
CREATE OR REPLACE FUNCTION public.is_responsable(p_child_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.responsables r
    WHERE r.child_id = p_child_id AND r.user_id = auth.uid()
  )
  AND NOT public.enfant_en_effacement(p_child_id)
  AND NOT public.compte_en_effacement(auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.est_du_foyer(p_foyer_id uuid, p_child_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.responsables r
    WHERE r.foyer_id = p_foyer_id AND r.child_id = p_child_id AND r.user_id = auth.uid()
  )
  AND NOT public.enfant_en_effacement(p_child_id)
  AND NOT public.compte_en_effacement(auth.uid());
$function$;

-- Fichiers du bucket : l'auteur en cours d'effacement ne relit plus ses propres fichiers, et personne ne
-- relit le dossier d'un enfant en cours d'effacement.
DROP POLICY carnet_fichiers_lecture ON storage.objects;
CREATE POLICY carnet_fichiers_lecture ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'carnet'
    AND NOT public.compte_en_effacement((select auth.uid()))
    -- dossier d'un enfant en cours d'effacement (chemin = <enfant>/<année>/<fichier>) : plus lisible
    AND NOT (split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             AND public.enfant_en_effacement(split_part(name, '/', 1)::uuid))
    AND (
      owner_id = ((select auth.uid()))::text
      OR EXISTS (
        SELECT 1 FROM public.carnet_items ci
        WHERE ci.fichier = objects.name
          AND public.is_responsable(ci.child_id)
          AND (ci.visibilite = 'foyer' OR ci.ajoute_par = (select auth.uid()))
      )
    )
  );

-- Conversations Aria : plus lisibles par un compte en cours d'effacement.
DROP POLICY aria_conv_select ON public.aria_conversations;
CREATE POLICY aria_conv_select ON public.aria_conversations
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = parent_id AND NOT compte_en_effacement((select auth.uid())));

DROP POLICY aria_msg_select ON public.aria_messages;
CREATE POLICY aria_msg_select ON public.aria_messages
  FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT c.id FROM public.aria_conversations c
    WHERE c.parent_id = (select auth.uid()) AND NOT public.compte_en_effacement((select auth.uid()))
  ));

-- Suppression immédiate d'un enfant : retirée (passe par la demande différée).
DROP POLICY IF EXISTS children_delete ON public.children;

-- ─── Départ d'un responsable : ses ajouts PRIVÉS à ce carnet sont supprimés ───────
-- (lisibles par lui seul, il n'y a plus accès : personne ne les verrait plus jamais). Leurs fichiers deviennent
-- orphelins et sont supprimés par le nettoyage quotidien (fichiers_orphelins). Ses ajouts « foyer » restent
-- dans le carnet de l'enfant.
CREATE OR REPLACE FUNCTION public.supprimer_prives_au_depart()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.carnet_items
  WHERE child_id = OLD.child_id AND ajoute_par = OLD.user_id AND visibilite = 'prive';
  RETURN OLD;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.supprimer_prives_au_depart() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER supprimer_prives_au_depart
  AFTER DELETE ON public.responsables
  FOR EACH ROW EXECUTE FUNCTION public.supprimer_prives_au_depart();

-- ─── Demander / annuler (compte connecté) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.demander_effacement_enfant(p_child_id uuid)
 RETURNS TABLE (demande_id uuid, execution_prevue_le timestamptz)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_id uuid;
  v_le timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_responsable(p_child_id) THEN
    RAISE EXCEPTION 'non_responsable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- Dès 2 responsables, chacun peut seulement se retirer (M2e) : pas d'effacement de l'enfant.
  IF (SELECT count(*) FROM public.responsables r WHERE r.child_id = p_child_id) <> 1 THEN
    RAISE EXCEPTION 'plusieurs_responsables' USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO public.demandes_effacement (portee, child_id, user_id)
  VALUES ('enfant', p_child_id, auth.uid())
  RETURNING id, demandes_effacement.execution_prevue_le INTO v_id, v_le;
  -- Invitations en attente pour cet enfant : annulées (personne ne rejoint un carnet qui va être effacé).
  UPDATE public.invitations_responsable SET statut = 'annulee'
  WHERE child_id = p_child_id AND statut = 'en_attente';
  RETURN QUERY SELECT v_id, v_le;
END;
$function$;

CREATE OR REPLACE FUNCTION public.demander_effacement_compte()
 RETURNS TABLE (demande_id uuid, execution_prevue_le timestamptz)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_id uuid;
  v_le timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_connecte' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- V1 : comptes famille seulement (un compte enseignant porte les mots et les classes : à traiter à part).
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'parent') THEN
    RAISE EXCEPTION 'compte_non_famille' USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO public.demandes_effacement (portee, user_id)
  VALUES ('compte', auth.uid())
  RETURNING id, demandes_effacement.execution_prevue_le INTO v_id, v_le;
  UPDATE public.invitations_responsable SET statut = 'annulee'
  WHERE invited_by = auth.uid() AND statut = 'en_attente';
  RETURN QUERY SELECT v_id, v_le;
END;
$function$;

CREATE OR REPLACE FUNCTION public.annuler_effacement(p_demande_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.demandes_effacement d SET annulee_le = now()
  WHERE d.id = p_demande_id AND d.user_id = auth.uid()
    AND d.annulee_le IS NULL AND d.executee_le IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'demande_introuvable' USING ERRCODE = 'no_data_found';
  END IF;
END;
$function$;

-- Demandes en attente du compte connecté (écran d'annulation) : prénom de l'enfant seulement.
CREATE OR REPLACE FUNCTION public.mes_effacements()
 RETURNS TABLE (demande_id uuid, portee text, prenom_enfant text, demandee_le timestamptz, execution_prevue_le timestamptz)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT d.id, d.portee, c.first_name, d.demandee_le, d.execution_prevue_le
  FROM public.demandes_effacement d
  LEFT JOIN public.children c ON c.id = d.child_id
  WHERE d.user_id = auth.uid() AND d.annulee_le IS NULL AND d.executee_le IS NULL
  ORDER BY d.demandee_le;
$function$;

-- Avant de demander l'effacement du compte : quels carnets seraient effacés (seul responsable) ou gardés.
CREATE OR REPLACE FUNCTION public.apercu_effacement_compte()
 RETURNS TABLE (prenom_enfant text, carnet_efface boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT c.first_name,
         (SELECT count(*) FROM public.responsables r2 WHERE r2.child_id = c.id) = 1
  FROM public.responsables r
  JOIN public.children c ON c.id = r.child_id
  WHERE r.user_id = auth.uid() AND NOT public.enfant_en_effacement(c.id)
  ORDER BY c.first_name;
$function$;

REVOKE EXECUTE ON FUNCTION public.demander_effacement_enfant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.demander_effacement_compte() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.annuler_effacement(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mes_effacements() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apercu_effacement_compte() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demander_effacement_enfant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demander_effacement_compte() TO authenticated;
GRANT EXECUTE ON FUNCTION public.annuler_effacement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mes_effacements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apercu_effacement_compte() TO authenticated;

-- ─── Exécution (service_role seulement, Edge Function « executer-effacements ») ─
-- Demandes échues.
CREATE OR REPLACE FUNCTION public.effacements_dus()
 RETURNS TABLE (demande_id uuid, portee text, user_id uuid)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT d.id, d.portee, d.user_id
  FROM public.demandes_effacement d
  WHERE d.annulee_le IS NULL AND d.executee_le IS NULL AND d.execution_prevue_le <= now()
  ORDER BY d.execution_prevue_le;
$function$;

-- Enfants effacés par une demande : l'enfant (portée enfant) ; pour un compte, les enfants dont il est
-- le SEUL responsable.
CREATE OR REPLACE FUNCTION public.enfants_a_effacer(p_demande_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT d.child_id FROM public.demandes_effacement d
  WHERE d.id = p_demande_id AND d.portee = 'enfant' AND EXISTS (SELECT 1 FROM public.children c WHERE c.id = d.child_id)
  UNION
  SELECT r.child_id FROM public.demandes_effacement d
  JOIN public.responsables r ON r.user_id = d.user_id
  WHERE d.id = p_demande_id AND d.portee = 'compte'
    AND (SELECT count(*) FROM public.responsables r2 WHERE r2.child_id = r.child_id) = 1;
$function$;

-- Fichiers du bucket « carnet » à supprimer AVANT les lignes (storage.protect_delete interdit le SQL direct).
CREATE OR REPLACE FUNCTION public.fichiers_a_effacer(p_demande_id uuid)
 RETURNS SETOF text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  -- tout le dossier des enfants effacés (chemin = <enfant>/<année>/<fichier>)
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'carnet'
    AND split_part(o.name, '/', 1) IN (SELECT e::text FROM public.enfants_a_effacer(p_demande_id) e)
  UNION
  -- compte : fichiers de ses ajouts PRIVÉS (ses ajouts « foyer » et leurs fichiers sont conservés)
  SELECT ci.fichier FROM public.carnet_items ci
  JOIN public.demandes_effacement d ON d.id = p_demande_id AND d.portee = 'compte'
  WHERE ci.ajoute_par = d.user_id AND ci.visibilite = 'prive' AND ci.fichier IS NOT NULL
  UNION
  -- compte : ses dépôts qu'aucun ajout ne référence
  SELECT o.name FROM storage.objects o
  JOIN public.demandes_effacement d ON d.id = p_demande_id AND d.portee = 'compte'
  WHERE o.bucket_id = 'carnet' AND o.owner_id = d.user_id::text
    AND NOT EXISTS (SELECT 1 FROM public.carnet_items ci WHERE ci.fichier = o.name);
$function$;

-- Lignes : à appeler APRÈS la suppression des fichiers. Idempotente.
-- Portée compte : le compte Auth est supprimé ENSUITE par l'Edge Function (cascade profiles), puis
-- marquer_effacement_execute().
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
    -- 4. Fils avec l'enseignant : individuels supprimés ; messages du fil famille gardés, auteur effacé.
    DELETE FROM public.teacher_conversations WHERE portee = 'individuel' AND parent_id = d.user_id;
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

CREATE OR REPLACE FUNCTION public.marquer_effacement_execute(p_demande_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  UPDATE public.demandes_effacement SET executee_le = now()
  WHERE id = p_demande_id AND executee_le IS NULL AND annulee_le IS NULL;
$function$;

-- Fichiers orphelins : dans le bucket, sans ligne carnet_items, plus vieux que p_age (dépôt interrompu,
-- ligne supprimée sans son fichier).
CREATE OR REPLACE FUNCTION public.fichiers_orphelins(p_age interval DEFAULT interval '1 day')
 RETURNS SETOF text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'carnet'
    AND o.created_at < now() - p_age
    AND NOT EXISTS (SELECT 1 FROM public.carnet_items ci WHERE ci.fichier = o.name);
$function$;

REVOKE EXECUTE ON FUNCTION public.effacements_dus() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enfants_a_effacer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fichiers_a_effacer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.executer_effacement(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.marquer_effacement_execute(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fichiers_orphelins(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.effacements_dus() TO service_role;
GRANT EXECUTE ON FUNCTION public.enfants_a_effacer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fichiers_a_effacer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.executer_effacement(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.marquer_effacement_execute(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fichiers_orphelins(interval) TO service_role;
