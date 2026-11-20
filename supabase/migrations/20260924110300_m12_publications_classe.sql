-- ════════════════════════════════════════════════════════════════════════════
-- M12 · Publications et événements de classe : par classe_id uniquement (Phase A, lot 3b) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924110300_m12_publications_classe_down.sql
--
--  - classe_id obligatoire (tables vides au moment de la migration). Le nom texte `classe` reste déprécié.
--  - Lecture parent : par classe_id (depuis M5a).
--  - Écriture : l'enseignant TITULAIRE de la classe uniquement. Avant : toute personne connectée pouvait
--    publier dans n'importe quelle classe (policy ALL « teacher_id = auth.uid() » sans contrôle de classe).
--  - « Vu » : seulement sur une publication que l'on peut lire.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.class_posts  ALTER COLUMN classe_id SET NOT NULL;
ALTER TABLE public.class_events ALTER COLUMN classe_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.is_titulaire_classe(p_classe_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = p_classe_id AND c.enseignant_id = auth.uid());
$function$;
REVOKE EXECUTE ON FUNCTION public.is_titulaire_classe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_titulaire_classe(uuid) TO authenticated;

-- ─── Publications ───────────────────────────────────────────────────────────
DROP POLICY "Teachers manage own class posts" ON public.class_posts;
CREATE POLICY class_posts_teacher_select ON public.class_posts FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());
CREATE POLICY class_posts_teacher_insert ON public.class_posts FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() AND public.is_titulaire_classe(classe_id));
CREATE POLICY class_posts_teacher_update ON public.class_posts FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid() AND public.is_titulaire_classe(classe_id));
CREATE POLICY class_posts_teacher_delete ON public.class_posts FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

-- ─── Événements ─────────────────────────────────────────────────────────────
DROP POLICY "Teachers manage own events" ON public.class_events;
CREATE POLICY class_events_teacher_select ON public.class_events FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());
CREATE POLICY class_events_teacher_insert ON public.class_events FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() AND public.is_titulaire_classe(classe_id));
CREATE POLICY class_events_teacher_update ON public.class_events FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid() AND public.is_titulaire_classe(classe_id));
CREATE POLICY class_events_teacher_delete ON public.class_events FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

-- ─── « Vu » : uniquement sur une publication lisible ────────────────────────
ALTER POLICY "Parents mark seen" ON public.class_post_seen
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid() AND post_id IN (SELECT cp.id FROM public.class_posts cp));
