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

CREATE OR REPLACE FUNCTION public.fichiers_a_effacer(p_demande_id uuid)
 RETURNS SETOF text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  -- tout le dossier des enfants effacés (chemin = <enfant>/<année>/<fichier>)
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'carnet'
    AND split_part(o.name, '/', 1) IN (SELECT e::text FROM public.enfants_a_effacer(p_demande_id) e)
  UNION
  -- compte : fichiers de ses ajouts PRIVÉS (ses ajouts « foyer » et leurs fichiers sont conservés)
  SELECT ci.fichier FROM public.carnet_items ci
  JOIN public.demandes_effacement d ON d.id = p_demande_id AND d.portee = 'compte'
  WHERE ci.ajoute_par = d.user_id AND ci.visibilite = 'prive' AND ci.fichier IS NOT NULL
  UNION
  -- compte : ses dépôts qu'aucun ajout ne référence
  SELECT o.name FROM storage.objects o
  JOIN public.demandes_effacement d ON d.id = p_demande_id AND d.portee = 'compte'
  WHERE o.bucket_id = 'carnet' AND o.owner_id = d.user_id::text
    AND NOT EXISTS (SELECT 1 FROM public.carnet_items ci WHERE ci.fichier = o.name);
$function$;
REVOKE EXECUTE ON FUNCTION public.fichiers_a_effacer(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fichiers_a_effacer(uuid) TO service_role;

DROP TABLE IF EXISTS public.absences_justificatifs;
DROP FUNCTION IF EXISTS public.absences_justificatifs_controler();

UPDATE public.absences SET motif = 'autre' WHERE motif = 'rendez_vous';
ALTER TABLE public.absences DROP CONSTRAINT absences_motif_check;
ALTER TABLE public.absences ADD CONSTRAINT absences_motif_check
  CHECK (motif = ANY (ARRAY['maladie'::text, 'maladie_avec_certificat'::text, 'raison_familiale'::text, 'autre'::text]));
