-- M42 — absence signalée par le parent (lot 4b, plan du 20 nov. 2026 dans tasks/todo.md, ajouts A3 et A5).
-- Inverse : supabase/migrations_down/20261120110000_m42_absence_signalee_down.sql.
--
-- 1. Motif « rendez-vous » : motifs proposés = maladie | rendez_vous | raison_familiale | autre (sans champ de détail).
--    L'ancienne valeur maladie_avec_certificat reste valide en base (lignes existantes), elle n'est plus proposée.
-- 2. Justificatif facultatif : absences.justificatif_path = un fichier du bucket PRIVÉ « carnet », au chemin
--    <enfant>/<année>/<uuid>.<ext> (même contrôle de dépôt que les fichiers du carnet : carnet_chemin_autorise ;
--    même effacement : le dossier de l'enfant part avec lui). Lu par URL signée d'1 h.
--    Lisible SEULEMENT par les responsables de l'enfant et le titulaire de sa classe (année de l'absence) ;
--    jamais par un autre enseignant de l'école ni par le parent d'un autre enfant.
--    Le chemin est contrôlé par le serveur (déclencheur) : fichier déposé par l'auteur de l'absence lui-même,
--    dans le dossier de CET enfant, et qui n'est pas un fichier du carnet (sinon un ajout « privé » d'un responsable
--    deviendrait lisible par l'autre et par l'enseignant).
--    Le nettoyage des fichiers orphelins (executer-effacements) ne supprime pas un justificatif référencé.
-- 3. Lecture des absences par le titulaire de la classe de l'enfant (« visible avant l'appel ») : condition ajoutée à
--    la SEULE politique de lecture (pas de seconde politique : pas de multiple_permissive_policies).
--    Aucune écriture par l'enseignant ; aucun statut « vu » en V1 (décision du 17 nov.).
-- Advisors : aucun WARN nouveau attendu (politiques sans auth.uid() direct, déclencheur non exécutable par un compte).

-- 1. Motif.
ALTER TABLE public.absences DROP CONSTRAINT absences_motif_check;
ALTER TABLE public.absences ADD CONSTRAINT absences_motif_check
  CHECK (motif = ANY (ARRAY['maladie'::text, 'rendez_vous'::text, 'raison_familiale'::text, 'autre'::text, 'maladie_avec_certificat'::text]));

-- 2. Justificatif.
ALTER TABLE public.absences ADD COLUMN justificatif_path text;
ALTER TABLE public.absences ADD CONSTRAINT absences_justificatif_dossier_check
  CHECK (justificatif_path IS NULL OR split_part(justificatif_path, '/', 1) = student_id::text);
CREATE INDEX idx_absences_justificatif ON public.absences USING btree (justificatif_path) WHERE justificatif_path IS NOT NULL;
COMMENT ON COLUMN public.absences.justificatif_path IS
  'Justificatif facultatif : objet du bucket privé « carnet » (<enfant>/<année>/<uuid>.<ext>), déposé par l''auteur de l''absence. Lisible par les responsables de l''enfant et le titulaire de sa classe seulement. M42.';

CREATE OR REPLACE FUNCTION public.absences_controler_justificatif()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.justificatif_path IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.justificatif_path IS NOT DISTINCT FROM OLD.justificatif_path THEN
    RETURN NEW;
  END IF;
  IF NOT public.carnet_chemin_autorise(NEW.justificatif_path)
     OR split_part(NEW.justificatif_path, '/', 1) <> NEW.student_id::text
     OR NOT EXISTS (
       SELECT 1 FROM storage.objects o
       WHERE o.bucket_id = 'carnet' AND o.name = NEW.justificatif_path AND o.owner_id = (SELECT auth.uid())::text
     )
     OR EXISTS (SELECT 1 FROM public.carnet_items ci WHERE ci.fichier = NEW.justificatif_path) THEN
    RAISE EXCEPTION 'justificatif non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.absences_controler_justificatif() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER absences_controler_justificatif BEFORE INSERT OR UPDATE OF justificatif_path ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.absences_controler_justificatif();

-- 3. Lecture : responsables de l'enfant, ou titulaire de la classe de l'année de l'absence.
ALTER POLICY absences_parent_select ON public.absences
  USING (public.is_responsable(student_id) OR public.is_titulaire_annee(academic_year_id));
ALTER POLICY absences_parent_select ON public.absences RENAME TO absences_select;

-- Lecture des fichiers du bucket « carnet » : la politique de M25, plus les justificatifs d'absence
-- (responsables de l'enfant, titulaire de sa classe).
DROP POLICY carnet_fichiers_lecture ON storage.objects;
CREATE POLICY carnet_fichiers_lecture ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'carnet'
    AND NOT public.compte_en_effacement((select auth.uid()))
    -- dossier d'un enfant en cours d'effacement (chemin = <enfant>/<année>/<fichier>) : plus lisible
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
      -- M42 : justificatif d'absence
      OR EXISTS (
        SELECT 1 FROM public.absences a
        WHERE a.justificatif_path = objects.name
          AND (public.is_responsable(a.student_id) OR public.is_titulaire_annee(a.academic_year_id))
      )
    )
  );

-- Nettoyage : un justificatif référencé par une absence n'est pas un fichier orphelin.
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
    AND NOT EXISTS (SELECT 1 FROM public.carnet_items ci WHERE ci.fichier = o.name)
    AND NOT EXISTS (SELECT 1 FROM public.absences a WHERE a.justificatif_path = o.name);
$function$;
REVOKE EXECUTE ON FUNCTION public.fichiers_orphelins(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fichiers_orphelins(interval) TO service_role;
