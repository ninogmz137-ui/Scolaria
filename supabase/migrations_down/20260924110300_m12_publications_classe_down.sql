-- M12 · INVERSE — revient à l'écriture « teacher_id = auth.uid() » sans contrôle de classe (état après M5a).
ALTER POLICY "Parents mark seen" ON public.class_post_seen
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());  -- équivalent de l'absence de WITH CHECK

DROP POLICY IF EXISTS class_events_teacher_delete ON public.class_events;
DROP POLICY IF EXISTS class_events_teacher_update ON public.class_events;
DROP POLICY IF EXISTS class_events_teacher_insert ON public.class_events;
DROP POLICY IF EXISTS class_events_teacher_select ON public.class_events;
CREATE POLICY "Teachers manage own events" ON public.class_events USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS class_posts_teacher_delete ON public.class_posts;
DROP POLICY IF EXISTS class_posts_teacher_update ON public.class_posts;
DROP POLICY IF EXISTS class_posts_teacher_insert ON public.class_posts;
DROP POLICY IF EXISTS class_posts_teacher_select ON public.class_posts;
CREATE POLICY "Teachers manage own class posts" ON public.class_posts USING (teacher_id = auth.uid());

DROP FUNCTION IF EXISTS public.is_titulaire_classe(uuid);

ALTER TABLE public.class_events ALTER COLUMN classe_id DROP NOT NULL;
ALTER TABLE public.class_posts  ALTER COLUMN classe_id DROP NOT NULL;
