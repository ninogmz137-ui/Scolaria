-- M30 · Durcissement issu de l'AUDIT DE SÉCURITÉ du 2 oct 2026 (scripts/audit-securite-local.mts, 670 tests).
-- Écarts de même type que les failles déjà trouvées (écriture sans vérification de rattachement, champs « auteur »
-- modifiables par l'utilisateur, oracles d'état) — corrigés ici ; le reste est SIGNALÉ dans tasks/audit-securite.md.
--
--  1. Oracles : compte_en_effacement / enfant_en_effacement / est_titulaire_enfant répondaient à n'importe quel compte
--     connecté pour n'importe quel identifiant (« ce compte est-il en cours d'effacement ? », « ce prof est-il
--     titulaire de cet enfant ? »). Elles ne répondent plus qu'au concerné (ou au serveur : auth.uid() NULL).
--  2. appreciations : un parent pouvait écrire une appréciation sur l'enfant d'un autre foyer → réservé au titulaire.
--  3. mots_liaison : insertion / modification avec le classe_id d'une classe dont on n'est pas titulaire → refusée.
--  4. messages (table non utilisée par l'app) : child_id d'un enfant qui n'est pas le sien → refusé ; le destinataire
--     ne peut plus réécrire le message (seuls is_read / read_at changent).
--  5. read_receipts : accusé de lecture sur un mot qui n'est pas dans ses carnets → refusé (gonflait le « lu par »).
--  6. Champs « auteur » / identifiants modifiables à la main → verrouillés : agenda_events.parent_id, children.parent_id,
--     children.scolaria_id, foyers.created_by ; invitations_responsable.expires_at (forcé à 7 jours à l'insertion) ;
--     profiles.plan (comme profiles.role).

-- ─── 1. Oracles ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compte_en_effacement(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT (auth.uid() IS NULL OR auth.uid() = p_user_id)
     AND EXISTS (
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
  SELECT (auth.uid() IS NULL
          OR EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = p_child_id AND r.user_id = auth.uid()))
     AND EXISTS (
       SELECT 1 FROM public.demandes_effacement d
       WHERE d.portee = 'enfant' AND d.child_id = p_child_id AND d.annulee_le IS NULL AND d.executee_le IS NULL
     );
$function$;

CREATE OR REPLACE FUNCTION public.est_titulaire_enfant(p_child_id uuid, p_teacher_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT (auth.uid() IS NULL OR auth.uid() = p_teacher_id
          OR EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = p_child_id AND r.user_id = auth.uid()))
     AND EXISTS (
       SELECT 1 FROM public.academic_years ay JOIN public.classes c ON c.id = ay.classe_id
       WHERE ay.student_id = p_child_id AND ay.statut = 'active' AND c.enseignant_id = p_teacher_id
     );
$function$;

-- ─── 2. appreciations ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Teachers manage own appreciations" ON public.appreciations;
CREATE POLICY appreciations_enseignant ON public.appreciations
  FOR ALL TO authenticated
  USING (teacher_id = (select auth.uid()))
  WITH CHECK (teacher_id = (select auth.uid()) AND public.est_titulaire_enfant(student_id, (select auth.uid())));

-- ─── 3. mots_liaison ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS mots_teacher_insert ON public.mots_liaison;
CREATE POLICY mots_teacher_insert ON public.mots_liaison
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = (select auth.uid()) AND (classe_id IS NULL OR public.is_titulaire_classe(classe_id)));
DROP POLICY IF EXISTS mots_teacher_update ON public.mots_liaison;
CREATE POLICY mots_teacher_update ON public.mots_liaison
  FOR UPDATE TO authenticated
  USING (teacher_id = (select auth.uid()))
  WITH CHECK (teacher_id = (select auth.uid()) AND (classe_id IS NULL OR public.is_titulaire_classe(classe_id)));

-- ─── 4. messages (table héritée, non utilisée par l'app) ─────────────────────
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = sender_id AND (child_id IS NULL OR public.is_responsable(child_id)));

CREATE OR REPLACE FUNCTION public.messages_verrou()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (to_jsonb(NEW) - 'is_read' - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'is_read' - 'read_at') THEN
    RAISE EXCEPTION 'un message ne peut pas être modifié (seul l''état « lu » change)' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS messages_verrou ON public.messages;
CREATE TRIGGER messages_verrou BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.messages_verrou();

-- ─── 5. read_receipts ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS rr_owner ON public.read_receipts;
CREATE POLICY rr_owner ON public.read_receipts
  FOR ALL TO authenticated
  USING (parent_id = (select auth.uid()))
  WITH CHECK (parent_id = (select auth.uid())
              AND mot_id IN (SELECT mc.mot_id FROM public.mot_carnets mc WHERE public.is_responsable(mc.child_id)));

-- ─── 6. Champs « auteur » et identifiants ────────────────────────────────────
-- Un changement vers NULL reste permis : c'est la clé étrangère ON DELETE SET NULL (suppression de compte, M25/M27).
CREATE OR REPLACE FUNCTION public.agenda_events_verrou_auteur()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.parent_id IS DISTINCT FROM OLD.parent_id AND NEW.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'l''auteur d''un événement ne peut pas être modifié' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS agenda_events_verrou_auteur ON public.agenda_events;
CREATE TRIGGER agenda_events_verrou_auteur BEFORE UPDATE OF parent_id ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.agenda_events_verrou_auteur();

CREATE OR REPLACE FUNCTION public.children_verrou_createur()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Depuis l'app (auth.uid() renseigné) : créateur et identifiant public non modifiables.
  -- Le serveur (effacement de compte : rattachement du créateur à un autre responsable) garde la main.
  IF auth.uid() IS NOT NULL AND (NEW.parent_id IS DISTINCT FROM OLD.parent_id OR NEW.scolaria_id IS DISTINCT FROM OLD.scolaria_id) THEN
    RAISE EXCEPTION 'le créateur et l''identifiant d''un enfant ne sont pas modifiables' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS children_verrou_createur ON public.children;
CREATE TRIGGER children_verrou_createur BEFORE UPDATE OF parent_id, scolaria_id ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.children_verrou_createur();

CREATE OR REPLACE FUNCTION public.foyers_verrou_createur()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by AND NEW.created_by IS NOT NULL THEN
    RAISE EXCEPTION 'le créateur d''un foyer ne peut pas être modifié' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS foyers_verrou_createur ON public.foyers;
CREATE TRIGGER foyers_verrou_createur BEFORE UPDATE OF created_by ON public.foyers
  FOR EACH ROW EXECUTE FUNCTION public.foyers_verrou_createur();

CREATE OR REPLACE FUNCTION public.invitations_expiration()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_at := now();
    NEW.expires_at := now() + interval '7 days';  -- durée de validité fixée par le serveur
    NEW.responded_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS invitations_expiration ON public.invitations_responsable;
CREATE TRIGGER invitations_expiration BEFORE INSERT ON public.invitations_responsable
  FOR EACH ROW EXECUTE FUNCTION public.invitations_expiration();

CREATE OR REPLACE FUNCTION public.protect_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'profiles.role ne peut pas être modifié par l''utilisateur'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'profiles.plan ne peut pas être modifié par l''utilisateur'
        USING ERRCODE = '42501';
    END IF;
    -- Création directe d'un profil (si handle_new_user a échoué) : parent, forfait gratuit uniquement.
    IF TG_OP = 'INSERT' AND (NEW.role IS DISTINCT FROM 'parent' OR NEW.plan IS DISTINCT FROM 'free') THEN
      RAISE EXCEPTION 'un profil créé par l''utilisateur est toujours « parent », forfait gratuit'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
