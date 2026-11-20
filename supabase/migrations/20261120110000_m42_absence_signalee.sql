-- M42 — absence signalée par le parent (lot 4b, plan du 20 nov. 2026 dans tasks/todo.md, ajouts A3 et A5 ;
-- règle du justificatif par foyer du 20 nov. 2026).
-- Inverse : supabase/migrations_down/20261120110000_m42_absence_signalee_down.sql.
--
-- 1. Motif « rendez-vous » : motifs proposés = maladie | rendez_vous | raison_familiale | autre (sans champ de détail).
--    L'ancienne valeur maladie_avec_certificat reste valide en base (lignes existantes), elle n'est plus proposée.
-- 2. Lecture des absences : tous les responsables de l'enfant (y compris d'un autre foyer : la carte « Absence ») et le
--    titulaire de la classe (« visible avant l'appel »), dans la SEULE politique de lecture. Aucune écriture enseignant.
-- 3. Justificatif facultatif, règle par FOYER :
--    - rangé dans absences_justificatifs (pas dans absences : un parent séparé voit l'absence mais ne doit pas savoir
--      qu'un justificatif existe) ; fichier du bucket PRIVÉ « carnet », <enfant>/<année>/<uuid>.<ext>, URL signée 1 h ;
--    - LISIBLE par les responsables du MÊME FOYER que l'auteur de l'absence et par le titulaire de la classe ;
--      un responsable d'un autre foyer ne voit ni la ligne ni le fichier ;
--    - JOINT par tout responsable du même foyer que l'auteur (quel que soit celui qui a signalé l'absence) ;
--    - contrôle serveur (déclencheur) : fichier dans le dossier de CET enfant, déposé par celui qui le joint (donc
--      un responsable du même foyer que l'auteur, par la politique), et qui n'est pas un fichier du carnet.
--    Nettoyage : un justificatif référencé n'est pas un orphelin ; à l'effacement d'un compte, ses dépôts qui
--    justifient l'absence signalée par quelqu'un d'autre sont conservés (l'absence reste).
-- Advisors : aucun WARN nouveau attendu (politiques avec (select auth.uid()), sans fonction SECURITY DEFINER exécutable
-- par un compte ; déclencheur non exécutable).

-- 1. Motif.
ALTER TABLE public.absences DROP CONSTRAINT absences_motif_check;
ALTER TABLE public.absences ADD CONSTRAINT absences_motif_check
  CHECK (motif = ANY (ARRAY['maladie'::text, 'rendez_vous'::text, 'raison_familiale'::text, 'autre'::text, 'maladie_avec_certificat'::text]));

-- 2. Lecture des absences : responsables de l'enfant, ou titulaire de la classe de l'année de l'absence.
ALTER POLICY absences_parent_select ON public.absences
  USING (public.is_responsable(student_id) OR public.is_titulaire_annee(academic_year_id));
ALTER POLICY absences_parent_select ON public.absences RENAME TO absences_select;

-- 3. Justificatifs.
CREATE TABLE public.absences_justificatifs (
  absence_id uuid PRIMARY KEY REFERENCES public.absences(id) ON DELETE CASCADE,
  chemin text NOT NULL UNIQUE,
  depose_par uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  depose_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_absences_justificatifs_depose_par ON public.absences_justificatifs USING btree (depose_par);
ALTER TABLE public.absences_justificatifs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.absences_justificatifs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.absences_justificatifs TO authenticated;
COMMENT ON TABLE public.absences_justificatifs IS
  'Justificatif d''une absence (fichier du bucket privé « carnet »). Lisible et joignable par les responsables du foyer de l''auteur de l''absence ; lisible par le titulaire de la classe ; invisible pour un responsable d''un autre foyer. M42.';

-- Lecture : foyer de l'auteur, ou titulaire.
CREATE POLICY absences_justificatifs_select ON public.absences_justificatifs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.absences a
      JOIN public.responsables moi ON moi.child_id = a.student_id AND moi.user_id = (SELECT auth.uid())
      JOIN public.responsables auteur ON auteur.child_id = a.student_id AND auteur.user_id = a.signalee_par
                                     AND auteur.foyer_id = moi.foyer_id
      WHERE a.id = absences_justificatifs.absence_id
    )
    OR EXISTS (
      SELECT 1 FROM public.absences a
      WHERE a.id = absences_justificatifs.absence_id AND public.is_titulaire_annee(a.academic_year_id)
    )
  );
-- Joindre (ou remplacer) : un responsable du foyer de l'auteur, en son nom.
CREATE POLICY absences_justificatifs_insert ON public.absences_justificatifs FOR INSERT TO authenticated
  WITH CHECK (
    depose_par = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.absences a
      JOIN public.responsables moi ON moi.child_id = a.student_id AND moi.user_id = (SELECT auth.uid())
      JOIN public.responsables auteur ON auteur.child_id = a.student_id AND auteur.user_id = a.signalee_par
                                     AND auteur.foyer_id = moi.foyer_id
      WHERE a.id = absences_justificatifs.absence_id
    )
  );
CREATE POLICY absences_justificatifs_update ON public.absences_justificatifs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.absences a
      JOIN public.responsables moi ON moi.child_id = a.student_id AND moi.user_id = (SELECT auth.uid())
      JOIN public.responsables auteur ON auteur.child_id = a.student_id AND auteur.user_id = a.signalee_par
                                     AND auteur.foyer_id = moi.foyer_id
      WHERE a.id = absences_justificatifs.absence_id
    )
  )
  WITH CHECK (depose_par = (SELECT auth.uid()));

-- Contrôle du fichier (serveur) : dossier de l'enfant de l'absence, déposé par celui qui le joint, hors carnet.
CREATE OR REPLACE FUNCTION public.absences_justificatifs_controler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_enfant uuid;
BEGIN
  SELECT a.student_id INTO v_enfant FROM public.absences a WHERE a.id = NEW.absence_id;
  NEW.depose_le := now();
  IF v_enfant IS NULL
     OR split_part(NEW.chemin, '/', 1) <> v_enfant::text
     OR NOT public.carnet_chemin_autorise(NEW.chemin)
     OR NOT EXISTS (
       SELECT 1 FROM storage.objects o
       WHERE o.bucket_id = 'carnet' AND o.name = NEW.chemin AND o.owner_id = (SELECT auth.uid())::text
     )
     OR EXISTS (SELECT 1 FROM public.carnet_items ci WHERE ci.fichier = NEW.chemin) THEN
    RAISE EXCEPTION 'justificatif non autorisé' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.absences_justificatifs_controler() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER absences_justificatifs_controler BEFORE INSERT OR UPDATE ON public.absences_justificatifs
  FOR EACH ROW EXECUTE FUNCTION public.absences_justificatifs_controler();

-- Lecture des fichiers du bucket « carnet » : la politique de M25, plus les justificatifs que la RLS de
-- absences_justificatifs laisse voir (foyer de l'auteur, titulaire).
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
      -- M42 : justificatif d'absence (RLS de absences_justificatifs : foyer de l'auteur, titulaire)
      OR EXISTS (SELECT 1 FROM public.absences_justificatifs j WHERE j.chemin = objects.name)
    )
  );

-- Nettoyage : un justificatif référencé n'est pas un orphelin.
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
    AND NOT EXISTS (SELECT 1 FROM public.absences_justificatifs j WHERE j.chemin = o.name);
$function$;
REVOKE EXECUTE ON FUNCTION public.fichiers_orphelins(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fichiers_orphelins(interval) TO service_role;

-- Effacement d'un compte : ses dépôts qui justifient l'absence signalée par QUELQU'UN D'AUTRE restent (l'absence
-- reste) ; ceux de ses propres absences partent avec elles.
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
  -- compte : ses dépôts qu'aucun ajout ne référence, sauf les justificatifs d'absences signalées par un autre (M42)
  SELECT o.name FROM storage.objects o
  JOIN public.demandes_effacement d ON d.id = p_demande_id AND d.portee = 'compte'
  WHERE o.bucket_id = 'carnet' AND o.owner_id = d.user_id::text
    AND NOT EXISTS (SELECT 1 FROM public.carnet_items ci WHERE ci.fichier = o.name)
    AND NOT EXISTS (
      SELECT 1 FROM public.absences_justificatifs j JOIN public.absences a ON a.id = j.absence_id
      WHERE j.chemin = o.name AND a.signalee_par <> d.user_id
    );
$function$;
REVOKE EXECUTE ON FUNCTION public.fichiers_a_effacer(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fichiers_a_effacer(uuid) TO service_role;
