-- ════════════════════════════════════════════════════════════════════════════
-- M20 · Stockage des fichiers du carnet (lot B5 « Ajouter au carnet ») — 2026-09-26
-- Inverse : supabase/migrations_down/20260926100000_m20_stockage_carnet_down.sql
-- ⚠ ÉCRITE ET TESTÉE EN LOCAL UNIQUEMENT — NON APPLIQUÉE À PARIS (décision de l'utilisateur).
--
--  - Bucket PRIVÉ « carnet » : photos (jpg, png, heic) et documents (pdf), 10 Mo au plus (valeur
--    proposée, à valider).
--  - Chemin : <child_id>/<academic_year_id>/<uuid>.<ext> (l'année appartient à l'enfant).
--  - Accès à un fichier = accès à la ligne carnet_items qui le référence (mêmes règles que M10) :
--    responsables de l'enfant ; visibilite 'prive' = son auteur seul. Enseignant : aucun accès en V1.
--    Anonyme : refusé (aucune politique pour anon).
--  - Dépôt : un responsable de l'enfant, dans un chemin valide ; le fichier lui appartient (owner_id).
--  - Suppression : son auteur. Pas de remplacement (aucune politique UPDATE).
--  - Une ligne ne peut référencer qu'un fichier déposé par son auteur, jamais celui d'un autre
--    (sinon un co-responsable pourrait « rendre public » un fichier privé en le référençant).
--  - Lecture côté app : uniquement par URL signée de 24 h (createSignedUrl), bucket non public.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Bucket privé ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('carnet', 'carnet', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/heic', 'application/pdf']);

-- ─── 2. Chemin autorisé pour un dépôt ───────────────────────────────────────
-- <child_id>/<academic_year_id>/<uuid>.<ext> : enfant dont l'appelant est responsable, année de cet
-- enfant, extension autorisée. SECURITY DEFINER : lit academic_years sans dépendre de la RLS.
CREATE OR REPLACE FUNCTION public.carnet_chemin_autorise(p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_parts text[] := string_to_array(p_name, '/');
  v_child uuid;
  v_year uuid;
BEGIN
  IF array_length(v_parts, 1) <> 3
     OR v_parts[3] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|heic|pdf)$' THEN
    RETURN false;
  END IF;
  BEGIN
    v_child := v_parts[1]::uuid;
    v_year := v_parts[2]::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;
  RETURN public.is_responsable(v_child)
     AND EXISTS (SELECT 1 FROM public.academic_years ay WHERE ay.id = v_year AND ay.student_id = v_child);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.carnet_chemin_autorise(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.carnet_chemin_autorise(text) TO authenticated;

-- ─── 3. Politiques du bucket « carnet » (storage.objects) ───────────────────
-- Lecture : via la ligne carnet_items qui référence le fichier, OU son auteur (owner_id). La 2e
-- condition ne donne rien à personne d'autre ; elle permet à l'auteur de supprimer un fichier resté
-- orphelin (envoi réussi, ligne non créée) : en Postgres, un DELETE ne voit que les lignes lisibles.
CREATE POLICY carnet_fichiers_lecture ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'carnet'
    AND (owner_id = auth.uid()::text OR EXISTS (
      SELECT 1 FROM public.carnet_items ci
      WHERE ci.fichier = storage.objects.name
        AND public.is_responsable(ci.child_id)
        AND (ci.visibilite = 'foyer' OR ci.ajoute_par = auth.uid())
    ))
  );

CREATE POLICY carnet_fichiers_depot ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'carnet'
    AND owner_id = auth.uid()::text
    AND public.carnet_chemin_autorise(name)
  );

CREATE POLICY carnet_fichiers_suppression ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'carnet' AND owner_id = auth.uid()::text);

-- ─── 4. carnet_items.fichier : cohérent avec l'enfant, l'année et l'auteur ──
CREATE UNIQUE INDEX carnet_items_fichier_unique ON public.carnet_items (fichier) WHERE fichier IS NOT NULL;

CREATE OR REPLACE FUNCTION public.carnet_items_fichier_controler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.fichier IS NULL OR (TG_OP = 'UPDATE' AND NEW.fichier IS NOT DISTINCT FROM OLD.fichier
                              AND NEW.academic_year_id IS NOT DISTINCT FROM OLD.academic_year_id) THEN
    RETURN NEW;
  END IF;
  -- Le fichier est rangé sous l'enfant et l'année de la ligne.
  IF NEW.fichier NOT LIKE NEW.child_id::text || '/' || NEW.academic_year_id::text || '/%' THEN
    RAISE EXCEPTION 'le fichier n''est pas rangé sous cet enfant et cette année' USING ERRCODE = '23514';
  END IF;
  -- Depuis l'app, on ne référence que SON propre fichier (dans une fonction DEFINER, current_user
  -- vaut le propriétaire : on se fie donc à auth.uid(), NULL pour le serveur).
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id = 'carnet' AND o.name = NEW.fichier AND o.owner_id = auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'fichier introuvable ou déposé par quelqu''un d''autre' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.carnet_items_fichier_controler() FROM PUBLIC, anon, authenticated;
-- Nom en « z… » : après set_academic_year (les triggers BEFORE passent par ordre alphabétique).
CREATE TRIGGER zz_carnet_items_fichier BEFORE INSERT OR UPDATE ON public.carnet_items
  FOR EACH ROW EXECUTE FUNCTION public.carnet_items_fichier_controler();
