-- Inverse de M35 · photo de l'enfant.
-- ⚠ Supprime le bucket « child-photos » : à ne lancer que si aucune photo n'y est (sinon, les supprimer d'abord par
-- l'API Storage ; la suppression directe en SQL laisserait des fichiers orphelins) et si l'app n'écrit plus photo_path.
BEGIN;
DROP FUNCTION IF EXISTS public.photos_orphelines(interval);
DROP FUNCTION IF EXISTS public.photos_a_effacer(uuid);
DROP POLICY IF EXISTS child_photos_lecture ON storage.objects;
DROP POLICY IF EXISTS child_photos_depot ON storage.objects;
DROP POLICY IF EXISTS child_photos_remplacement ON storage.objects;
DROP POLICY IF EXISTS child_photos_suppression ON storage.objects;
DROP FUNCTION IF EXISTS public.child_photo_chemin_autorise(text);
-- storage.protect_delete interdit le DELETE SQL direct : garde-fou levé pour cette seule transaction (d'où BEGIN / COMMIT).
SELECT set_config('storage.allow_delete_query', 'true', true);
DELETE FROM storage.buckets WHERE id = 'child-photos';
ALTER TABLE public.children DROP CONSTRAINT IF EXISTS children_photo_path_check;
ALTER TABLE public.children DROP COLUMN IF EXISTS photo_path;
COMMIT;
