-- M33 · Un mot de liaison (brouillon compris) n'est créable que par un compte dont profiles.role = 'enseignant'.
-- LOCALE, NON appliquée à Paris. Ferme le dernier écart de l'audit de sécurité (constat B2) : un parent pouvait créer un
-- brouillon de mot SANS classe (sans effet pour autrui, mais un parent n'a pas à écrire dans mots_liaison).
--
--  - est_enseignant() : le compte connecté a-t-il profiles.role = 'enseignant' ? (SECURITY DEFINER, lit SA ligne seulement ;
--    profiles.role est verrouillé par déclencheur : la personne ne peut pas se l'attribuer.)
--  - mots_teacher_insert / mots_teacher_update : exigent est_enseignant() EN PLUS du reste (auteur = soi, classe dont on est
--    titulaire). Un titulaire de classe sans le rôle n'écrit donc pas non plus.
-- Le rôle « enseignant » n'est donné que par validation manuelle (tasks/comptes-enseignants.md) : aujourd'hui aucun compte réel
-- ne l'a, aucun mot réel n'existe, rien ne change pour les familles.
--
-- Inverse : supabase/migrations_down/20260928180000_m33_role_enseignant_mots_down.sql

CREATE OR REPLACE FUNCTION public.est_enseignant()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'enseignant');
$function$;
REVOKE EXECUTE ON FUNCTION public.est_enseignant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.est_enseignant() TO authenticated;

DROP POLICY IF EXISTS mots_teacher_insert ON public.mots_liaison;
CREATE POLICY mots_teacher_insert ON public.mots_liaison
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = (select auth.uid()) AND public.est_enseignant()
              AND (classe_id IS NULL OR public.is_titulaire_classe(classe_id)));

DROP POLICY IF EXISTS mots_teacher_update ON public.mots_liaison;
CREATE POLICY mots_teacher_update ON public.mots_liaison
  FOR UPDATE TO authenticated
  USING (teacher_id = (select auth.uid()))
  WITH CHECK (teacher_id = (select auth.uid()) AND public.est_enseignant()
              AND (classe_id IS NULL OR public.is_titulaire_classe(classe_id)));
