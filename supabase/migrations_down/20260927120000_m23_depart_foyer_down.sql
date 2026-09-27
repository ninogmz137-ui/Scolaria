-- Inverse de M23 · départ d'un foyer. Revient aux politiques de M22 (lecture = membre actuel).
DROP POLICY IF EXISTS fils_select ON public.teacher_conversations;
CREATE POLICY fils_select ON public.teacher_conversations FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR (portee = 'individuel' AND parent_id = auth.uid() AND public.is_responsable(student_id))
    OR (portee = 'foyer' AND public.est_du_foyer(foyer_id, student_id))
  );
DROP POLICY IF EXISTS fils_messages_select ON public.teacher_messages;
CREATE POLICY fils_messages_select ON public.teacher_messages FOR SELECT TO authenticated
  USING (public.peut_lire_fil(conversation_id));
DROP POLICY IF EXISTS fils_update ON public.teacher_conversations;
CREATE POLICY fils_update ON public.teacher_conversations FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
DROP POLICY IF EXISTS fils_insert ON public.teacher_conversations;
CREATE POLICY fils_insert ON public.teacher_conversations FOR INSERT TO authenticated
  WITH CHECK (
    public.est_titulaire_enfant(student_id, teacher_id)
    AND (
      (teacher_id = auth.uid() AND (
        (portee = 'foyer' AND EXISTS (SELECT 1 FROM public.responsables r WHERE r.foyer_id = teacher_conversations.foyer_id AND r.child_id = teacher_conversations.student_id))
        OR (portee = 'individuel' AND EXISTS (SELECT 1 FROM public.responsables r WHERE r.user_id = teacher_conversations.parent_id AND r.child_id = teacher_conversations.student_id))
      ))
      OR (teacher_id <> auth.uid() AND (
        (portee = 'foyer' AND public.est_du_foyer(foyer_id, student_id))
        OR (portee = 'individuel' AND parent_id = auth.uid() AND public.is_responsable(student_id))
      ))
    )
  );
DROP POLICY IF EXISTS fils_messages_insert ON public.teacher_messages;
CREATE POLICY fils_messages_insert ON public.teacher_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND sender_role = public.role_dans_fil(conversation_id));
DROP INDEX IF EXISTS public.idx_teacher_conv_foyer;
-- fil_enseignant de M22 (lecture = membre actuel).
CREATE OR REPLACE FUNCTION public.fil_enseignant(p_conversation_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(NULLIF(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.family_name, '')), ''), 'Enseignant')
  FROM public.teacher_conversations c LEFT JOIN public.profiles p ON p.id = c.teacher_id
  WHERE c.id = p_conversation_id AND public.peut_lire_fil(c.id);
$function$;
DROP FUNCTION IF EXISTS public.depart_du_fil(uuid);
DROP TRIGGER IF EXISTS enregistrer_depart_foyer ON public.responsables;
DROP FUNCTION IF EXISTS public.enregistrer_depart_foyer();
DROP TABLE IF EXISTS public.departs_foyer;
