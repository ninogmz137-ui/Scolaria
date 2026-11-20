-- ════════════════════════════════════════════════════════════════════════════
-- M36 · Photo de l'enfant PAR ANNÉE SCOLAIRE (variante A, plan tasks/plan-photo-par-annee.md) — 2026-10-07
-- Inverse : supabase/migrations_down/20261007200000_m36_photo_par_annee_down.sql
-- ⚠ ÉCRITE ET TESTÉE EN LOCAL UNIQUEMENT — NON APPLIQUÉE À PARIS (l'utilisateur lit ce SQL avant tout cycle).
-- M37 (retrait de children.photo_path et de l'ancien chemin) n'est PAS dans ce lot.
--
--  1. academic_years.photo_path : chemin de la photo de CET enfant pour CETTE année, NULL = pas de photo. Imposé par une
--     contrainte : toujours « <id de l'enfant>/<id de l'année>.jpg » (l'identifiant de l'année, pas le millésime : stable si le
--     libellé est corrigé). Écriture : policy academic_years_update existante (is_responsable) ; les verrous M17 / M18 / M19
--     (découpage, échelle, rattachement, statut) ne portent PAS sur cette colonne : une année archivée ou rattachée à une classe
--     garde sa photo modifiable et supprimable (prouvé par supabase/tests/m36_photo_par_annee.sql).
--  2. Politiques de storage.objects (bucket « child-photos » inchangé : privé, JPEG, 1 Mo) : la fonction d'aide accepte
--     <enfant>/<année>.jpg si l'année appartient à l'enfant du chemin ET si l'appelant est responsable (is_responsable : faux pour un
--     responsable parti, un compte ou un enfant en cours d'effacement) ; TRANSITION : elle accepte encore <enfant>/avatar.jpg
--     (M35) jusqu'à M37. Enseignant, direction : AUCUN accès, jamais (aucune politique, aucune mention de classes,
--     enseignant_id ni classe_id : testé structurellement) ; anonyme : refusé. Une photo d'année précédente n'est lisible que
--     d'un responsable rattaché.
--  3. Effacement : photos_a_effacer(demande) est INCHANGÉE (préfixe = identifiant de l'enfant effacé : toutes ses photos, de toutes
--     les années, y compris l'ancien avatar.jpg) — prouvé de bout en bout par l'API Storage (scripts/test-photo-annee-local.mts).
--  4. Nettoyage : photos_orphelines() ne garde plus un objet que s'il est référencé par children.photo_path OU
--     academic_years.photo_path ; l'âge se mesure sur la dernière écriture, comme en M35. Dès que children.photo_path est remis à
--     NULL (M37), l'ancien avatar.jpg devient orphelin et est purgé par le nettoyage quotidien.
--
--  TRANSITION M36 → M37 : QUELLE COLONNE GAGNE, QUI ÉCRIT OÙ (mêmes règles : tasks/plan-photo-par-annee.md § 5 bis ; src/utils/photoAnnee.ts)
--   · M36 NE MIGRE RIEN : children.photo_path et les objets <enfant>/avatar.jpg restent tels quels ; academic_years.photo_path = NULL.
--   · LECTURE par la nouvelle app, dans cet ordre : (1) academic_years.photo_path de l'année EN COURS ; (2) celui de l'année N−1
--     seulement (repli, avec signe d'année passée) ; (3) children.photo_path (ancien modèle) ; (4) l'initiale. Quand les deux
--     colonnes DIVERGENT, academic_years GAGNE toujours (children.photo_path n'est lue que si aucune année — en cours ou N−1 — n'a de photo).
--     L'ANCIENNE app ne lit que children.photo_path (elle ignore les années : l'affichage peut diverger entre deux responsables, sans erreur).
--   · ÉCRITURE : la nouvelle app, base avec M36 : AJOUT / REMPLACEMENT → academic_years.photo_path de l'année en cours + objet
--     <enfant>/<année>.jpg, jamais children.photo_path ni avatar.jpg ; SUPPRESSION → la photo de l'année (colonne NULL puis objet), SAUF
--     si la photo affichée vient de l'ancien modèle : alors children.photo_path NULL puis objet avatar.jpg. L'ancienne app écrit
--     toujours children.photo_path + avatar.jpg (la base l'accepte jusqu'à M37). Aucun écrivain côté serveur.
--   · Cette fonction d'aide et les 4 politiques acceptent donc les DEUX chemins ; photos_orphelines() protège les deux références.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Colonne par année ───────────────────────────────────────────────────
ALTER TABLE public.academic_years ADD COLUMN photo_path text NULL;
ALTER TABLE public.academic_years
  ADD CONSTRAINT academic_years_photo_path_check
  CHECK (photo_path IS NULL OR photo_path = student_id::text || '/' || id::text || '.jpg');
COMMENT ON COLUMN public.academic_years.photo_path IS
  'Chemin de la photo de l''enfant pour cette année dans le bucket privé « child-photos » (<id de l''enfant>/<id de l''année>.jpg) ; NULL = pas de photo.';

-- ─── 2. Chemin autorisé (SECURITY INVOKER : lecture de academic_years sous RLS, réservée aux responsables) ───
CREATE OR REPLACE FUNCTION public.child_photo_chemin_autorise(p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_child uuid;
  v_annee uuid;
BEGIN
  -- Transition (jusqu'à M37) : l'ancien chemin de M35.
  IF p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.jpg$' THEN
    RETURN public.is_responsable(split_part(p_name, '/', 1)::uuid);
  END IF;
  -- M36 : <enfant>/<année>.jpg, l'année appartient à cet enfant, l'appelant est responsable de cet enfant.
  IF p_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$' THEN
    RETURN false;
  END IF;
  v_child := split_part(p_name, '/', 1)::uuid;
  v_annee := replace(split_part(p_name, '/', 2), '.jpg', '')::uuid;
  RETURN public.is_responsable(v_child)
     AND EXISTS (SELECT 1 FROM public.academic_years ay WHERE ay.id = v_annee AND ay.student_id = v_child);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.child_photo_chemin_autorise(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.child_photo_chemin_autorise(text) TO authenticated;
-- Les 4 politiques de M35 (child_photos_lecture, _depot, _remplacement, _suppression) appellent cette fonction : inchangées.

-- ─── 3. Nettoyage : un objet est conservé s'il est référencé par l'un OU l'autre ────────────────
CREATE OR REPLACE FUNCTION public.photos_orphelines(p_age interval DEFAULT interval '1 day')
 RETURNS SETOF text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'child-photos'
    AND GREATEST(o.created_at, COALESCE(o.updated_at, o.created_at)) < now() - p_age
    AND NOT EXISTS (SELECT 1 FROM public.children c WHERE c.photo_path = o.name)
    AND NOT EXISTS (SELECT 1 FROM public.academic_years ay WHERE ay.photo_path = o.name);
$function$;
REVOKE EXECUTE ON FUNCTION public.photos_orphelines(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.photos_orphelines(interval) TO service_role;
