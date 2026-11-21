-- M45 — annuler une absence signalée par erreur (lot 6 ; règles tranchées par l'utilisateur le 21 nov. 2026,
-- tasks/todo.md § Lot 6). Inverse : supabase/migrations_down/20261122100000_m45_annuler_absence_down.sql.
--
-- 1. Qui : un responsable du FOYER DE L'AUTEUR de l'absence. Un parent séparé (autre foyer) ne peut pas l'annuler.
-- 2. Jusqu'à quand : jusqu'au DÉBUT de l'absence, heure de Paris : 8 h 00 le premier jour (matin, journée, plusieurs
--    jours), 13 h 00 pour une absence de l'après-midi. Règle appliquée par la base (déclencheur), pas par l'écran.
-- 3. Comment : statut « annulée » (jamais de suppression de ligne), `annulee_le` et `annulee_par` posés par la base ;
--    le justificatif éventuel est retiré (ligne `absences_justificatifs` supprimée ; son fichier n'est plus référencé :
--    l'app le supprime aussitôt si son compte en est le dépôt, sinon le nettoyage des orphelins le supprime).
-- 4. Après le début : refus. Une absence annulée n'est plus modifiable.
-- Les autres modifications restent réservées à l'auteur (comme avant M45) ; le titulaire lit le statut « annulée »
-- (« Annulée par la famille »).
-- Advisors : aucun WARN nouveau attendu (une seule politique UPDATE, réécrite avec (SELECT auth.uid()) ; fonction de
-- déclencheur SECURITY DEFINER exécutable par personne, search_path vide ; clé étrangère indexée).

ALTER TABLE public.absences DROP CONSTRAINT absences_statut_check;
ALTER TABLE public.absences ADD CONSTRAINT absences_statut_check
  CHECK (statut = ANY (ARRAY['signalée'::text, 'prise_en_compte'::text, 'annulée'::text]));

ALTER TABLE public.absences
  ADD COLUMN annulee_le timestamptz,
  ADD COLUMN annulee_par uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX idx_absences_annulee_par ON public.absences USING btree (annulee_par);

-- Mise à jour : tout responsable du foyer de l'auteur (le déclencheur limite ce qu'un non-auteur peut changer).
ALTER POLICY absences_parent_update ON public.absences
  USING (
    EXISTS (
      SELECT 1
      FROM public.responsables moi
      JOIN public.responsables auteur ON auteur.child_id = moi.child_id AND auteur.foyer_id = moi.foyer_id
      WHERE moi.child_id = absences.student_id
        AND moi.user_id = (SELECT auth.uid())
        AND auteur.user_id = absences.signalee_par
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.responsables moi
      JOIN public.responsables auteur ON auteur.child_id = moi.child_id AND auteur.foyer_id = moi.foyer_id
      WHERE moi.child_id = absences.student_id
        AND moi.user_id = (SELECT auth.uid())
        AND auteur.user_id = absences.signalee_par
    )
  );

CREATE OR REPLACE FUNCTION public.absences_controler_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_moi uuid := (SELECT auth.uid());
  v_debut timestamptz;
BEGIN
  -- Maintenance côté serveur (compte de service, superutilisateur) : pas d'appelant authentifié.
  IF v_moi IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.statut = 'annulée' THEN
    RAISE EXCEPTION 'absence annulée : plus modifiable' USING ERRCODE = '42501';
  END IF;

  IF NEW.statut = 'annulée' THEN
    -- Annulation : rien d'autre ne change.
    IF (NEW.student_id, NEW.academic_year_id, NEW.date_debut, NEW.date_fin, NEW.demi_journee, NEW.motif, NEW.commentaire, NEW.signalee_par)
       IS DISTINCT FROM
       (OLD.student_id, OLD.academic_year_id, OLD.date_debut, OLD.date_fin, OLD.demi_journee, OLD.motif, OLD.commentaire, OLD.signalee_par) THEN
      RAISE EXCEPTION 'annulation : aucune autre modification possible' USING ERRCODE = '42501';
    END IF;
    v_debut := (OLD.date_debut + CASE WHEN OLD.demi_journee = 'apres_midi' THEN time '13:00' ELSE time '08:00' END)
               AT TIME ZONE 'Europe/Paris';
    IF now() >= v_debut THEN
      RAISE EXCEPTION 'absence commencée : annulation impossible' USING ERRCODE = '42501';
    END IF;
    NEW.annulee_le := now();
    NEW.annulee_par := v_moi;
    DELETE FROM public.absences_justificatifs WHERE absence_id = OLD.id;
    RETURN NEW;
  END IF;

  -- Toute autre modification : l'auteur seulement (règle d'avant M45), sans toucher aux champs d'annulation.
  IF v_moi IS DISTINCT FROM OLD.signalee_par
     OR NEW.annulee_le IS DISTINCT FROM OLD.annulee_le
     OR NEW.annulee_par IS DISTINCT FROM OLD.annulee_par THEN
    RAISE EXCEPTION 'modification réservée à l''auteur de l''absence' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.absences_controler_modification() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER absences_controler_modification BEFORE UPDATE ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.absences_controler_modification();
