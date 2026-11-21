-- ════════════════════════════════════════════════════════════════════════════
-- M35 · Photo de l'enfant (sprint « Carnet vivant », lot 4) — 2026-10-05
-- Inverse : supabase/migrations_down/20261005100000_m35_photo_enfant_down.sql
-- ⚠ ÉCRITE ET TESTÉE EN LOCAL UNIQUEMENT — NON APPLIQUÉE À PARIS (attend la validation de l'utilisateur).
--
-- Donnée personnelle d'un MINEUR : stockage PRIVÉ, URL signées (1 h) seulement, jamais de lien public.
--
--  1. children.photo_path : chemin de l'objet, NULL = pas de photo. Imposé par une contrainte : toujours
--     « <id de l'enfant>/avatar.jpg » (un seul objet par enfant ; une ligne ne peut pas pointer la photo d'un autre).
--     Écriture : policy children_update existante (is_responsable) — comme le fond d'Accueil, partagé.
--  2. Bucket PRIVÉ « child-photos » : JPEG seulement, 1 Mo au plus (la photo est ré-encodée en 512×512 sur l'appareil).
--  3. Politiques de storage.objects : lecture, dépôt, remplacement, suppression réservés aux responsables rattachés
--     à l'enfant du chemin (helper is_responsable, le même que les fichiers du carnet). Enseignant, direction : AUCUN
--     accès dans ce sprint ; anonyme : refusé (aucune politique pour anon). Un responsable parti ou en cours
--     d'effacement perd l'accès (is_responsable = faux).
--  4. Effacement : l'objet ne suit pas la cascade SQL (storage.protect_delete). photos_a_effacer(demande) liste
--     les photos des enfants effacés (l'Edge Function executer-effacements les supprime par l'API Storage AVANT les
--     lignes, comme les fichiers du carnet) ; photos_orphelines() liste les objets que plus aucun enfant ne référence
--     (dépôt interrompu, suppression partielle) pour le nettoyage quotidien ; l'âge d'un objet se mesure sur sa dernière
--     écriture, GREATEST(created_at, updated_at) : une photo ancienne qui vient d'être remplacée n'est jamais listée.
--     Fonctions réservées au service.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Colonne ─────────────────────────────────────────────────────────────
ALTER TABLE public.children ADD COLUMN photo_path text NULL;
ALTER TABLE public.children
  ADD CONSTRAINT children_photo_path_check CHECK (photo_path IS NULL OR photo_path = id::text || '/avatar.jpg');
COMMENT ON COLUMN public.children.photo_path IS
  'Chemin de la photo de l''enfant dans le bucket privé « child-photos » (<id>/avatar.jpg) ; NULL = pas de photo.';

-- ─── 2. Bucket privé ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('child-photos', 'child-photos', false, 1048576, ARRAY['image/jpeg']);

-- ─── 3. Chemin autorisé : <uuid de l'enfant>/avatar.jpg, enfant dont l'appelant est responsable ───
-- SECURITY INVOKER : is_responsable() fait la lecture protégée (aucune fonction DEFINER de plus exposée aux comptes).
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

CREATE POLICY child_photos_lecture ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'child-photos' AND public.child_photo_chemin_autorise(name));

CREATE POLICY child_photos_depot ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'child-photos' AND owner_id = (select auth.uid())::text AND public.child_photo_chemin_autorise(name));

-- Remplacement (upsert) : tout responsable rattaché, pas seulement celui qui a déposé la première photo.
CREATE POLICY child_photos_remplacement ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'child-photos' AND public.child_photo_chemin_autorise(name))
  WITH CHECK (bucket_id = 'child-photos' AND public.child_photo_chemin_autorise(name));

CREATE POLICY child_photos_suppression ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'child-photos' AND public.child_photo_chemin_autorise(name));

-- ─── 4. Effacement et nettoyage (service seulement) ─────────────────────────
CREATE OR REPLACE FUNCTION public.photos_a_effacer(p_demande_id uuid)
 RETURNS SETOF text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'child-photos'
    AND split_part(o.name, '/', 1) IN (SELECT e::text FROM public.enfants_a_effacer(p_demande_id) e);
$function$;

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

REVOKE EXECUTE ON FUNCTION public.photos_a_effacer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.photos_orphelines(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.photos_a_effacer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.photos_orphelines(interval) TO service_role;
