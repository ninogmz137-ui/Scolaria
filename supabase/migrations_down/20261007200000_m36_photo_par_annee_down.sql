-- Inverse de M36 · photo par année scolaire. Remet en place les définitions de M35.
-- ⚠ Les objets déposés au nouveau chemin <enfant>/<année>.jpg ne seraient plus autorisés par la fonction d'aide : AVANT de lancer ce
-- fichier, les supprimer par l'API Storage (ou accepter qu'ils soient repris par le nettoyage des orphelins : sans colonne
-- academic_years.photo_path, ils ne sont plus référencés). Aucune donnée de table n'est perdue en dehors de academic_years.photo_path.
BEGIN;
CREATE OR REPLACE FUNCTION public.child_photo_chemin_autorise(p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_child uuid;
BEGIN
  IF p_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.jpg$' THEN
    RETURN false;
  END IF;
  v_child := split_part(p_name, '/', 1)::uuid;
  RETURN public.is_responsable(v_child);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.child_photo_chemin_autorise(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.child_photo_chemin_autorise(text) TO authenticated;

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
    AND NOT EXISTS (SELECT 1 FROM public.children c WHERE c.photo_path = o.name);
$function$;
REVOKE EXECUTE ON FUNCTION public.photos_orphelines(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.photos_orphelines(interval) TO service_role;

ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_photo_path_check;
ALTER TABLE public.academic_years DROP COLUMN IF EXISTS photo_path;
COMMIT;
