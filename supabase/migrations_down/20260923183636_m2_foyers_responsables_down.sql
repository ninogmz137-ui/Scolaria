-- ════════════════════════════════════════════════════════════════════════════
-- M2 · INVERSE — rétablit les policies de l'état après M1 et supprime foyers / responsables.
-- ⚠️ Supprime les liens responsables (les enfants restent rattachés à leur créateur via parent_id).
-- ════════════════════════════════════════════════════════════════════════════

ALTER POLICY "Parents read events" ON public.class_events
  USING (classe IN (SELECT c.classe FROM public.children c WHERE c.parent_id = auth.uid()));
ALTER POLICY "Parents read class posts" ON public.class_posts
  USING (classe IN (SELECT c.classe FROM public.children c WHERE c.parent_id = auth.uid()));
ALTER POLICY mots_parent_select ON public.mots_liaison
  USING ((classe IN ( SELECT c.classe FROM children c WHERE (c.parent_id = auth.uid()))));

ALTER POLICY sig_parent_select ON public.signatures USING ((parent_id = auth.uid()));
ALTER POLICY sig_parent_insert ON public.signatures
  WITH CHECK (((parent_id = auth.uid()) AND (student_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid())))));

ALTER POLICY subjects_update ON public.subjects USING ((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY subjects_insert ON public.subjects WITH CHECK ((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY subjects_select ON public.subjects USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));

ALTER POLICY grades_delete ON public.grades USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));
ALTER POLICY grades_update ON public.grades USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));
ALTER POLICY grades_insert ON public.grades WITH CHECK (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));
ALTER POLICY grades_select ON public.grades USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));

ALTER POLICY checkins_insert ON public.checkins WITH CHECK ((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY checkins_select ON public.checkins USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));

ALTER POLICY bulletins_delete ON public.bulletins USING ((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY bulletins_update ON public.bulletins USING ((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY bulletins_insert ON public.bulletins WITH CHECK ((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY bulletins_select ON public.bulletins USING ((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));

ALTER POLICY aria_conv_insert ON public.aria_conversations WITH CHECK ((auth.uid() = parent_id));

ALTER POLICY agenda_delete ON public.agenda_events USING ((auth.uid() = parent_id));
ALTER POLICY agenda_update ON public.agenda_events USING ((auth.uid() = parent_id));
ALTER POLICY agenda_insert ON public.agenda_events WITH CHECK ((auth.uid() = parent_id));
ALTER POLICY agenda_select ON public.agenda_events USING ((auth.uid() = parent_id));

ALTER POLICY academic_years_delete ON public.academic_years USING ((student_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY academic_years_update ON public.academic_years USING ((student_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY academic_years_insert ON public.academic_years WITH CHECK ((student_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY academic_years_select ON public.academic_years USING ((student_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));

ALTER POLICY absences_parent_update ON public.absences USING ((student_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY absences_parent_select ON public.absences USING ((student_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid()))));
ALTER POLICY absences_parent_insert ON public.absences
  WITH CHECK (((signalee_par = auth.uid()) AND (student_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid())))));

ALTER POLICY children_delete ON public.children USING ((auth.uid() = parent_id));
ALTER POLICY children_update ON public.children USING ((auth.uid() = parent_id)) WITH CHECK ((auth.uid() = parent_id));
ALTER POLICY children_select ON public.children USING (auth.uid() = parent_id);

DROP TRIGGER IF EXISTS add_child_creator_as_responsable ON public.children;
DROP FUNCTION IF EXISTS public.add_child_creator_as_responsable();
DROP TABLE IF EXISTS public.responsables;
DROP TABLE IF EXISTS public.foyers;
DROP FUNCTION IF EXISTS public.is_responsable(uuid);
