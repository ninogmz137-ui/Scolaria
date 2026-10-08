-- ════════════════════════════════════════════════════════════════════════════
-- M1 · Correctifs de sécurité immédiats (Phase A, lot 1) — 2026-09-23
-- Inverse : 20260923145605_m1_securite_down.sql
--
-- 1. Vues : security_invoker (elles appliquaient la RLS de leur créateur → tous les enfants
--    visibles de tous, anon compris) ; plus de SELECT pour anon.
-- 2. Fonctions : search_path fixé ; handle_new_user non appelable via l'API (/rest/v1/rpc).
-- 3. profiles.role : jamais modifiable par l'utilisateur lui-même (trigger + policy).
-- 4. Enseignants : AUCUNE lecture de donnée d'enfant en attendant le lien enseignant ↔ classe (M2+).
-- 5. Publications de classe : lisibles uniquement par les responsables d'un enfant de la classe.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Vues ────────────────────────────────────────────────────────────────
ALTER VIEW public.child_overview SET (security_invoker = true);
ALTER VIEW public.subject_averages SET (security_invoker = true);
ALTER VIEW public.mots_liaison_enriched SET (security_invoker = true);
REVOKE SELECT ON public.child_overview, public.subject_averages, public.mots_liaison_enriched FROM anon;

-- ─── 2. Fonctions ───────────────────────────────────────────────────────────
ALTER FUNCTION public.generate_scolaria_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
-- Fonction de trigger uniquement : le trigger on_auth_user_created continue de fonctionner
-- (le droit EXECUTE n'est vérifié qu'à la création du trigger, pas à son déclenchement).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ─── 3. Rôle non modifiable par l'utilisateur ───────────────────────────────
-- Via l'API, les requêtes s'exécutent sous le rôle Postgres anon / authenticated.
-- service_role, postgres et le trigger handle_new_user (SECURITY DEFINER) restent autorisés.
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
    -- Création directe d'un profil (si handle_new_user a échoué) : parent uniquement.
    IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'parent' THEN
      RAISE EXCEPTION 'un profil créé par l''utilisateur est toujours « parent »'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER protect_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Policy : la ligne mise à jour doit garder le rôle actuel (défense en profondeur).
ALTER POLICY profiles_update ON public.profiles
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ─── 4. Enseignants : plus aucune lecture de donnée d'enfant ────────────────
-- (le rôle « enseignant » était de plus auto-attribuable jusqu'ici)
DROP POLICY absences_teacher_select ON public.absences;
DROP POLICY absences_teacher_update ON public.absences;
DROP POLICY sig_teacher_select ON public.signatures;

ALTER POLICY children_select ON public.children
  USING (auth.uid() = parent_id);

ALTER POLICY subjects_select ON public.subjects
  USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));

ALTER POLICY grades_select ON public.grades
  USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));
ALTER POLICY grades_insert ON public.grades
  WITH CHECK (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));
ALTER POLICY grades_update ON public.grades
  USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));
ALTER POLICY grades_delete ON public.grades
  USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));

-- L'ancienne requête (UNION incohérente) ouvrait aussi les ressentis à tout enseignant.
ALTER POLICY checkins_select ON public.checkins
  USING (child_id IN (SELECT c.id FROM public.children c WHERE c.parent_id = auth.uid()));

-- ─── 5. Publications de classe : responsables d'un enfant de la classe ──────
-- ⚠️ Rattachement par le texte `classe` (ex. « CE1 ») : deux écoles avec une classe du même nom
-- se verraient. Remplacé par un vrai identifiant de classe avec le lien enseignant ↔ classe.
ALTER POLICY "Parents read class posts" ON public.class_posts
  USING (classe IN (SELECT c.classe FROM public.children c WHERE c.parent_id = auth.uid()));

ALTER POLICY "Parents read events" ON public.class_events
  USING (classe IN (SELECT c.classe FROM public.children c WHERE c.parent_id = auth.uid()));

-- Réactions visibles seulement si la publication l'est (la sous-requête applique la RLS de class_posts).
ALTER POLICY "Anyone can see reactions" ON public.class_post_reactions
  USING (post_id IN (SELECT cp.id FROM public.class_posts cp));
ALTER POLICY "Anyone can react" ON public.class_post_reactions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND post_id IN (SELECT cp.id FROM public.class_posts cp));
