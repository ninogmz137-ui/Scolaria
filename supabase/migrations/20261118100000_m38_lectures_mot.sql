-- M38 — compteur enseignant « ont lu » (lot 3b, décision du 18 nov. 2026 qui remplace I4).
-- Plan : tasks/lot3b-plan-sql.md. Inverse : supabase/migrations_down/20261118100000_m38_lectures_mot_down.sql.
--
-- Décision 7 : le « lu » d'un mot est enregistré par responsable et par mot (read_receipts, clé unique
-- (mot_id, parent_id)) — c'est DÉJÀ le cas, aucune table ne change. Ce qui manque : le compteur enseignant
-- « N élèves sur M ont lu ». read_receipts n'est lisible que par son auteur (politique rr_owner, M30) :
-- l'enseignant ne peut rien compter. D'où une fonction qui ne rend QUE deux nombres agrégés, jamais
-- l'identité de qui a lu.
--
-- Règle de comptage : un élève compte comme « lu » dès qu'UN de ses responsables (table responsables,
-- rattaché à CET élève) a un accusé de lecture pour ce mot.
-- Accès : seul l'auteur du mot (mots_liaison.teacher_id) obtient des nombres ; tout autre appelant obtient
-- 0 ligne.
-- Advisors : fonction SECURITY DEFINER exécutable par authenticated → 1 WARN attendu
-- (« authenticated_security_definer_function_executable ») à déclarer dans tasks/warns-attendus.md AVANT
-- le cycle (leçon du 4 oct. 2026). SECURITY INVOKER impossible : l'enseignant ne lit pas read_receipts.

CREATE OR REPLACE FUNCTION public.lectures_mot(p_mot_id uuid)
RETURNS TABLE (eleves_destinataires integer, eleves_lus integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    count(DISTINCT mc.child_id)::integer AS eleves_destinataires,
    (count(DISTINCT mc.child_id) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.read_receipts rr
        JOIN public.responsables r
          ON r.user_id = rr.parent_id
         AND r.child_id = mc.child_id
        WHERE rr.mot_id = mc.mot_id
      )
    ))::integer AS eleves_lus
  FROM public.mot_carnets mc
  JOIN public.mots_liaison m ON m.id = mc.mot_id
  WHERE mc.mot_id = p_mot_id
    AND m.teacher_id = (SELECT auth.uid())
  HAVING count(*) > 0;
$$;

REVOKE ALL ON FUNCTION public.lectures_mot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lectures_mot(uuid) TO authenticated;

COMMENT ON FUNCTION public.lectures_mot(uuid) IS
  'Compteur enseignant « ont lu » (décision 7, 16 nov. 2026) : élèves destinataires du mot et élèves dont au moins un responsable a lu. Auteur du mot seulement ; nombres agrégés, jamais d''identité.';
