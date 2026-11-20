-- Inverse de M33 : rétablit les politiques de M30 (sans exigence du rôle « enseignant ») et retire est_enseignant().
DROP POLICY IF EXISTS mots_teacher_insert ON public.mots_liaison;
CREATE POLICY mots_teacher_insert ON public.mots_liaison
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = (select auth.uid()) AND (classe_id IS NULL OR public.is_titulaire_classe(classe_id)));

DROP POLICY IF EXISTS mots_teacher_update ON public.mots_liaison;
CREATE POLICY mots_teacher_update ON public.mots_liaison
  FOR UPDATE TO authenticated
  USING (teacher_id = (select auth.uid()))
  WITH CHECK (teacher_id = (select auth.uid()) AND (classe_id IS NULL OR public.is_titulaire_classe(classe_id)));

DROP FUNCTION IF EXISTS public.est_enseignant();
