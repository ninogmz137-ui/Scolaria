-- ════════════════════════════════════════════════════════════════════════════
-- M1 · INVERSE — rétablit l'état du 2026-09-23 avant M1 (voir supabase/backups/schema-2026-09-23.sql).
-- ⚠️ Rouvre les failles corrigées par M1 : à n'utiliser qu'en cas de régression bloquante.
-- ════════════════════════════════════════════════════════════════════════════

-- 5. Publications de classe
-- (policy d'origine sans WITH CHECK = même condition que USING)
ALTER POLICY "Anyone can react" ON public.class_post_reactions USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER POLICY "Anyone can see reactions" ON public.class_post_reactions USING (true);
ALTER POLICY "Parents read events" ON public.class_events USING (true);
ALTER POLICY "Parents read class posts" ON public.class_posts USING (true);

-- 4. Enseignants
ALTER POLICY checkins_select ON public.checkins
  USING ((child_id IN ( SELECT checkins.child_id
   FROM (children c
     JOIN profiles p ON ((c.parent_id = auth.uid())))
UNION ALL
 SELECT checkins.child_id
   FROM children
  WHERE (auth.uid() IN ( SELECT p.id
           FROM profiles p
          WHERE (p.role = 'enseignant'::text))))));

ALTER POLICY grades_delete ON public.grades
  USING (((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid())))
    OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
ALTER POLICY grades_update ON public.grades
  USING (((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid())))
    OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
ALTER POLICY grades_insert ON public.grades
  WITH CHECK (((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid())))
    OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
ALTER POLICY grades_select ON public.grades
  USING (((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid())))
    OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
ALTER POLICY subjects_select ON public.subjects
  USING (((child_id IN ( SELECT children.id FROM children WHERE (children.parent_id = auth.uid())))
    OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
ALTER POLICY children_select ON public.children
  USING (((auth.uid() = parent_id)
    OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));

CREATE POLICY sig_teacher_select ON public.signatures AS PERMISSIVE FOR SELECT TO public
  USING ((mot_id IN ( SELECT mots_liaison.id FROM mots_liaison WHERE (mots_liaison.teacher_id = auth.uid()))));
CREATE POLICY absences_teacher_update ON public.absences AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text)))));
CREATE POLICY absences_teacher_select ON public.absences AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text)))));

-- 3. Rôle
ALTER POLICY profiles_update ON public.profiles USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_role();

-- 2. Fonctions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.update_updated_at() RESET search_path;
ALTER FUNCTION public.generate_scolaria_id() RESET search_path;

-- 1. Vues
GRANT SELECT ON public.child_overview, public.subject_averages, public.mots_liaison_enriched TO anon;
ALTER VIEW public.mots_liaison_enriched SET (security_invoker = false);
ALTER VIEW public.subject_averages SET (security_invoker = false);
ALTER VIEW public.child_overview SET (security_invoker = false);
