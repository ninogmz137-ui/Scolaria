-- Inverse de M30 : retour aux fonctions, politiques et verrous d'avant l'audit du 2 oct 2026
-- (les écarts corrigés par M30 sont alors rouverts).
DROP TRIGGER IF EXISTS invitations_expiration ON public.invitations_responsable;
DROP FUNCTION IF EXISTS public.invitations_expiration();
DROP TRIGGER IF EXISTS foyers_verrou_createur ON public.foyers;
DROP FUNCTION IF EXISTS public.foyers_verrou_createur();
DROP TRIGGER IF EXISTS children_verrou_createur ON public.children;
DROP FUNCTION IF EXISTS public.children_verrou_createur();
DROP TRIGGER IF EXISTS agenda_events_verrou_auteur ON public.agenda_events;
DROP FUNCTION IF EXISTS public.agenda_events_verrou_auteur();
DROP TRIGGER IF EXISTS messages_verrou ON public.messages;
DROP FUNCTION IF EXISTS public.messages_verrou();

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
    IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'parent' THEN
      RAISE EXCEPTION 'un profil créé par l''utilisateur est toujours « parent »'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS rr_owner ON public.read_receipts;
CREATE POLICY rr_owner ON public.read_receipts FOR ALL USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS mots_teacher_update ON public.mots_liaison;
CREATE POLICY mots_teacher_update ON public.mots_liaison FOR UPDATE USING (teacher_id = auth.uid());
DROP POLICY IF EXISTS mots_teacher_insert ON public.mots_liaison;
CREATE POLICY mots_teacher_insert ON public.mots_liaison FOR INSERT WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS appreciations_enseignant ON public.appreciations;
CREATE POLICY "Teachers manage own appreciations" ON public.appreciations FOR ALL USING (teacher_id = auth.uid());

CREATE OR REPLACE FUNCTION public.est_titulaire_enfant(p_child_id uuid, p_teacher_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.academic_years ay JOIN public.classes c ON c.id = ay.classe_id
    WHERE ay.student_id = p_child_id AND ay.statut = 'active' AND c.enseignant_id = p_teacher_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.enfant_en_effacement(p_child_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.demandes_effacement d
    WHERE d.portee = 'enfant' AND d.child_id = p_child_id AND d.annulee_le IS NULL AND d.executee_le IS NULL
  );
$function$;

CREATE OR REPLACE FUNCTION public.compte_en_effacement(p_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.demandes_effacement d
    WHERE d.portee = 'compte' AND d.user_id = p_user_id AND d.annulee_le IS NULL AND d.executee_le IS NULL
  );
$function$;
