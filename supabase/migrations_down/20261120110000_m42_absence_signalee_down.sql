-- Inverse de M42 (absence signalée). Les absences sont conservées ; leurs justificatifs ne sont plus référencés
-- (les fichiers restent dans le bucket : le nettoyage des orphelins les supprimera). Une absence au motif
-- « rendez_vous » repasse en « autre » (sinon l'ancienne contrainte refuserait la ligne).
ALTER POLICY absences_select ON public.absences RENAME TO absences_parent_select;
ALTER POLICY absences_parent_select ON public.absences USING (public.is_responsable(student_id));

DROP POLICY carnet_fichiers_lecture ON storage.objects;
CREATE POLICY carnet_fichiers_lecture ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'carnet'
    AND NOT public.compte_en_effacement((select auth.uid()))
    AND NOT (split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             AND public.enfant_en_effacement(split_part(name, '/', 1)::uuid))
    AND (
      owner_id = ((select auth.uid()))::text
      OR EXISTS (
        SELECT 1 FROM public.carnet_items ci
        WHERE ci.fichier = objects.name
          AND public.is_responsable(ci.child_id)
          AND (ci.visibilite = 'foyer' OR ci.ajoute_par = (select auth.uid()))
      )
    )
  );

CREATE OR REPLACE FUNCTION public.fichiers_orphelins(p_age interval DEFAULT interval '1 day')
 RETURNS SETOF text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'carnet'
    AND o.created_at < now() - p_age
    AND NOT EXISTS (SELECT 1 FROM public.carnet_items ci WHERE ci.fichier = o.name);
$function$;
REVOKE EXECUTE ON FUNCTION public.fichiers_orphelins(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fichiers_orphelins(interval) TO service_role;

DROP TRIGGER IF EXISTS absences_controler_justificatif ON public.absences;
DROP FUNCTION IF EXISTS public.absences_controler_justificatif();
DROP INDEX IF EXISTS public.idx_absences_justificatif;
ALTER TABLE public.absences DROP CONSTRAINT IF EXISTS absences_justificatif_dossier_check;
ALTER TABLE public.absences DROP COLUMN IF EXISTS justificatif_path;

UPDATE public.absences SET motif = 'autre' WHERE motif = 'rendez_vous';
ALTER TABLE public.absences DROP CONSTRAINT absences_motif_check;
ALTER TABLE public.absences ADD CONSTRAINT absences_motif_check
  CHECK (motif = ANY (ARRAY['maladie'::text, 'maladie_avec_certificat'::text, 'raison_familiale'::text, 'autre'::text]));
