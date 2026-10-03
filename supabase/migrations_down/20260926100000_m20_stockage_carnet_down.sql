-- Inverse de M20 · stockage des fichiers du carnet.
-- ⚠ Supprime le bucket « carnet » : à ne lancer que si aucun fichier n'y est (sinon, les supprimer
-- d'abord par l'API Storage ; la suppression directe en SQL laisserait les fichiers orphelins).
DROP TRIGGER IF EXISTS zz_carnet_items_fichier ON public.carnet_items;
DROP FUNCTION IF EXISTS public.carnet_items_fichier_controler();
DROP INDEX IF EXISTS public.carnet_items_fichier_unique;
DROP POLICY IF EXISTS carnet_fichiers_lecture ON storage.objects;
DROP POLICY IF EXISTS carnet_fichiers_depot ON storage.objects;
DROP POLICY IF EXISTS carnet_fichiers_suppression ON storage.objects;
DROP FUNCTION IF EXISTS public.carnet_chemin_autorise(text);
-- storage.protect_delete interdit le DELETE SQL direct : garde-fou levé pour cette seule transaction.
SELECT set_config('storage.allow_delete_query', 'true', true);
DELETE FROM storage.buckets WHERE id = 'carnet';
