-- Inverse de M40 (annonce seule). Aucune donnée touchée.
BEGIN;

DROP POLICY IF EXISTS reactions_select ON public.class_post_reactions;
CREATE POLICY "Anyone can see reactions" ON public.class_post_reactions
  FOR SELECT USING (post_id IN (SELECT cp.id FROM public.class_posts cp));
CREATE POLICY "Anyone can react" ON public.class_post_reactions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND post_id IN (SELECT cp.id FROM public.class_posts cp));

CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = sender_id AND (child_id IS NULL OR public.is_responsable(child_id)));

COMMIT;
