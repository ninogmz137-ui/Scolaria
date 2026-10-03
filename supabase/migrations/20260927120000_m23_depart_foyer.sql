-- M23 · Parent qui quitte le foyer : historique du fil famille en LECTURE SEULE jusqu'à son départ
-- (décision du 27 sept 2026, tasks/b4-decisions.md §6). + corrections de performance de M22.
--
-- - departs_foyer : un départ est enregistré AUTOMATIQUEMENT quand un responsable quitte un foyer pour un
--   enfant (ligne responsables supprimée, ou foyer_id changé).
-- - Le parent parti LIT encore le fil famille de son ancien foyer, mais seulement les messages écrits
--   jusqu'à la date de son départ ; il ne peut plus y écrire ni le marquer lu (les politiques d'écriture
--   restent sur peut_lire_fil, membre ACTUEL). Ses nouveaux messages vont dans le fil de son nouveau foyer.
-- - Condition retenue : il doit être encore responsable de l'enfant (nouveau foyer). S'il ne l'est plus du
--   tout, il ne lit plus rien (cas non tranché : question notée au todo).
-- - Performance (advisors après M22) : index sur teacher_conversations.foyer_id ; auth.uid() évalué une
--   seule fois par requête dans les politiques des fils ((select auth.uid())).

CREATE TABLE public.departs_foyer (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  foyer_id uuid NOT NULL,
  child_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parti_le timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT departs_foyer_pkey PRIMARY KEY (id),
  CONSTRAINT departs_foyer_foyer_id_fkey FOREIGN KEY (foyer_id) REFERENCES public.foyers(id) ON DELETE CASCADE,
  CONSTRAINT departs_foyer_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE,
  CONSTRAINT departs_foyer_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);
CREATE INDEX idx_departs_foyer_user_child ON public.departs_foyer USING btree (user_id, child_id);
CREATE INDEX idx_departs_foyer_foyer ON public.departs_foyer USING btree (foyer_id);
CREATE INDEX idx_departs_foyer_child ON public.departs_foyer USING btree (child_id);
-- Aucune politique : table lue seulement par les fonctions ci-dessous (SECURITY DEFINER), jamais par l'API.
ALTER TABLE public.departs_foyer ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.departs_foyer FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enregistrer_depart_foyer()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Suppression en cascade (enfant, foyer ou compte supprimé) : rien à conserver, et l'enregistrement
  -- casserait la suppression (clés étrangères vers une ligne déjà supprimée).
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE id = OLD.child_id)
     OR NOT EXISTS (SELECT 1 FROM public.foyers WHERE id = OLD.foyer_id)
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.user_id) THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.departs_foyer (foyer_id, child_id, user_id) VALUES (OLD.foyer_id, OLD.child_id, OLD.user_id);
    RETURN OLD;
  END IF;
  IF NEW.foyer_id IS DISTINCT FROM OLD.foyer_id THEN
    INSERT INTO public.departs_foyer (foyer_id, child_id, user_id) VALUES (OLD.foyer_id, OLD.child_id, OLD.user_id);
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.enregistrer_depart_foyer() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enregistrer_depart_foyer AFTER DELETE OR UPDATE OF foyer_id ON public.responsables
  FOR EACH ROW EXECUTE FUNCTION public.enregistrer_depart_foyer();

-- Date de départ de l'appelant du foyer d'un fil famille (NULL s'il n'en est jamais parti, ou s'il n'est
-- plus responsable de l'enfant). Le dernier départ fait foi.
CREATE OR REPLACE FUNCTION public.depart_du_fil(p_conversation_id uuid)
 RETURNS timestamp with time zone LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT max(d.parti_le)
  FROM public.teacher_conversations c
  JOIN public.departs_foyer d ON d.foyer_id = c.foyer_id AND d.child_id = c.student_id AND d.user_id = auth.uid()
  WHERE c.id = p_conversation_id AND c.portee = 'foyer'
    AND NOT public.est_du_foyer(c.foyer_id, c.student_id)
    AND public.is_responsable(c.student_id);
$function$;
REVOKE EXECUTE ON FUNCTION public.depart_du_fil(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.depart_du_fil(uuid) TO authenticated;

-- Nom de l'enseignant : aussi pour un fil consulté en lecture seule.
CREATE OR REPLACE FUNCTION public.fil_enseignant(p_conversation_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(NULLIF(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.family_name, '')), ''), 'Enseignant')
  FROM public.teacher_conversations c LEFT JOIN public.profiles p ON p.id = c.teacher_id
  WHERE c.id = p_conversation_id
    AND (public.peut_lire_fil(c.id) OR public.depart_du_fil(c.id) IS NOT NULL);
$function$;

-- ─── Politiques de lecture : membre actuel, OU parent parti (lecture bornée) ─────────
-- Écriture inchangée (fils_insert, fils_messages_insert, fils_messages_update : membre ACTUEL).
DROP POLICY IF EXISTS fils_select ON public.teacher_conversations;
CREATE POLICY fils_select ON public.teacher_conversations FOR SELECT TO authenticated
  USING (
    teacher_id = (select auth.uid())
    OR (portee = 'individuel' AND parent_id = (select auth.uid()) AND public.is_responsable(student_id))
    OR (portee = 'foyer' AND public.est_du_foyer(foyer_id, student_id))
    OR (portee = 'foyer' AND public.depart_du_fil(id) IS NOT NULL)
  );

DROP POLICY IF EXISTS fils_messages_select ON public.teacher_messages;
CREATE POLICY fils_messages_select ON public.teacher_messages FOR SELECT TO authenticated
  USING (
    public.peut_lire_fil(conversation_id)
    OR created_at <= public.depart_du_fil(conversation_id)
  );

-- ─── Performance (advisors après M22) ───────────────────────────────────────
CREATE INDEX idx_teacher_conv_foyer ON public.teacher_conversations USING btree (foyer_id);

DROP POLICY IF EXISTS fils_update ON public.teacher_conversations;
CREATE POLICY fils_update ON public.teacher_conversations FOR UPDATE TO authenticated
  USING (teacher_id = (select auth.uid())) WITH CHECK (teacher_id = (select auth.uid()));

DROP POLICY IF EXISTS fils_insert ON public.teacher_conversations;
CREATE POLICY fils_insert ON public.teacher_conversations FOR INSERT TO authenticated
  WITH CHECK (
    public.est_titulaire_enfant(student_id, teacher_id)
    AND (
      (teacher_id = (select auth.uid()) AND (
        (portee = 'foyer' AND EXISTS (SELECT 1 FROM public.responsables r WHERE r.foyer_id = teacher_conversations.foyer_id AND r.child_id = teacher_conversations.student_id))
        OR (portee = 'individuel' AND EXISTS (SELECT 1 FROM public.responsables r WHERE r.user_id = teacher_conversations.parent_id AND r.child_id = teacher_conversations.student_id))
      ))
      OR (teacher_id <> (select auth.uid()) AND (
        (portee = 'foyer' AND public.est_du_foyer(foyer_id, student_id))
        OR (portee = 'individuel' AND parent_id = (select auth.uid()) AND public.is_responsable(student_id))
      ))
    )
  );

DROP POLICY IF EXISTS fils_messages_insert ON public.teacher_messages;
CREATE POLICY fils_messages_insert ON public.teacher_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = (select auth.uid()) AND sender_role = public.role_dans_fil(conversation_id));
