-- M41 — devoirs : « Coché par [prénom] · [heure] », visible dans le foyer de l'auteur seulement
-- (lot 4a, plan du 20 nov. 2026 dans tasks/todo.md ; règle des parents séparés du 20 nov. 2026).
-- Inverse : supabase/migrations_down/20261120100000_m41_devoirs_coche_par_down.sql.
--
-- Règle (CLAUDE.md § Garde partagée, COMPONENTS §18.6) :
--   - la coche « fait » (agenda_events.is_done) est partagée entre TOUS les responsables de l'enfant, y compris
--     d'un autre foyer (inchangé : politiques agenda_select / agenda_update, is_responsable) ;
--   - l'AUTEUR et l'HEURE de la coche ne sont visibles qu'à l'intérieur du foyer de celui qui a coché ; un
--     responsable d'un autre foyer voit seulement « Fait ». Le masquage est fait par la base.
--
-- Mise en œuvre :
--   - agenda_coches : auteur et heure de la coche, une ligne par événement coché. Écrite par le SERVEUR seul
--     (déclencheur sur agenda_events.is_done : cocher pose (auth.uid(), now()), décocher efface la ligne) ;
--     aucune écriture par un compte. LECTURE par RLS : la ligne n'est rendue qu'à l'auteur et aux responsables de
--     son foyer pour cet enfant ; ailleurs elle est invisible, et l'app affiche « Fait » (agenda_events.is_done).
--     Pas de fonction SECURITY DEFINER (21 nov. 2026 : même modèle que M43, aucun avertissement).
--   - agenda_events n'est PAS modifiée : `select('*')` de l'app (et d'une app plus ancienne) reste valide.
-- Événements créés par un parent : contenu modifié et suppression par le foyer de l’auteur seulement (règle du
-- 21 nov. 2026, en fin de fichier).
-- Advisors : AUCUN WARN nouveau attendu (lecture par RLS avec (SELECT auth.uid()), une seule politique ; les deux
-- déclencheurs SECURITY DEFINER ne sont exécutables par personne).

CREATE TABLE public.agenda_coches (
  event_id uuid PRIMARY KEY REFERENCES public.agenda_events(id) ON DELETE CASCADE,
  fait_par uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fait_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agenda_coches_fait_par ON public.agenda_coches USING btree (fait_par);
ALTER TABLE public.agenda_coches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agenda_coches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.agenda_coches TO authenticated;
-- Lecture : l'auteur, ou un responsable du même foyer que l'auteur pour l'enfant de l'événement.
CREATE POLICY agenda_coches_select ON public.agenda_coches FOR SELECT TO authenticated
  USING (
    fait_par = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.agenda_events e
      JOIN public.responsables moi ON moi.child_id = e.child_id AND moi.user_id = (SELECT auth.uid())
      JOIN public.responsables auteur ON auteur.child_id = e.child_id AND auteur.user_id = agenda_coches.fait_par
                                     AND auteur.foyer_id = moi.foyer_id
      WHERE e.id = agenda_coches.event_id
    )
  );
COMMENT ON TABLE public.agenda_coches IS
  'Auteur et heure de la coche « fait » d''un événement (devoir). Écrite par le déclencheur agenda_events_poser_coche ; lisible par l''auteur et son foyer seulement (règle des parents séparés), invisible ailleurs. M41.';

-- Déclencheur : la coche pose l'auteur et l'heure, la décoche les efface. Jamais une valeur venue du client.
CREATE OR REPLACE FUNCTION public.agenda_events_poser_coche()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.is_done IS DISTINCT FROM OLD.is_done THEN
    IF NEW.is_done THEN
      INSERT INTO public.agenda_coches (event_id, fait_par, fait_le)
      VALUES (NEW.id, (SELECT auth.uid()), now())
      ON CONFLICT (event_id) DO UPDATE SET fait_par = EXCLUDED.fait_par, fait_le = EXCLUDED.fait_le;
    ELSIF TG_OP = 'UPDATE' THEN
      DELETE FROM public.agenda_coches WHERE event_id = NEW.id;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.agenda_events_poser_coche() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER agenda_events_poser_coche AFTER INSERT OR UPDATE OF is_done ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.agenda_events_poser_coche();


-- ─── Événements créés par un parent : modifiés et supprimés par le FOYER DE L'AUTEUR (règle du 21 nov. 2026) ───
-- Tout responsable de l'enfant voit l'événement et coche « fait » (coche partagée, ci-dessus). Le CONTENU (titre,
-- type, date, lieu…) n'est modifié, et l'événement n'est supprimé, que par l'auteur (parent_id) ou un responsable de
-- son foyer pour cet enfant. Auteur inconnu (parent_id vide) ou qui n'est plus responsable de l'enfant : tout
-- responsable (sinon plus personne ne pourrait modifier). Pas de seconde politique de mise à jour (la coche doit
-- rester permise à tous) : un déclencheur refuse les changements de contenu hors foyer.

CREATE OR REPLACE FUNCTION public.agenda_events_verrou_foyer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_moi uuid := (SELECT auth.uid());
BEGIN
  -- Serveur (effacement, maintenance) : pas de contrôle.
  IF v_moi IS NULL OR OLD.parent_id IS NULL OR OLD.parent_id = v_moi THEN
    RETURN NEW;
  END IF;
  -- Coche seule (is_done, fait_* hors table) ou rien de visible : permis à tout responsable.
  IF NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW.description IS NOT DISTINCT FROM OLD.description
     AND NEW.event_type IS NOT DISTINCT FROM OLD.event_type
     AND NEW.subject IS NOT DISTINCT FROM OLD.subject
     AND NEW.color IS NOT DISTINCT FROM OLD.color
     AND NEW.location IS NOT DISTINCT FROM OLD.location
     AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time
     AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time
     AND NEW.is_all_day IS NOT DISTINCT FROM OLD.is_all_day
     AND NEW.reminder_minutes IS NOT DISTINCT FROM OLD.reminder_minutes
     AND NEW.child_id IS NOT DISTINCT FROM OLD.child_id THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
       SELECT 1
       FROM public.responsables moi
       JOIN public.responsables auteur ON auteur.child_id = moi.child_id AND auteur.foyer_id = moi.foyer_id
       WHERE moi.child_id = OLD.child_id AND moi.user_id = v_moi AND auteur.user_id = OLD.parent_id
     )
     OR NOT EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = OLD.child_id AND r.user_id = OLD.parent_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'seul le foyer qui a ajouté cet événement peut le modifier' USING ERRCODE = '42501';
END;
$function$;
REVOKE ALL ON FUNCTION public.agenda_events_verrou_foyer() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER agenda_events_verrou_foyer BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.agenda_events_verrou_foyer();

ALTER POLICY agenda_delete ON public.agenda_events
  USING (
    public.is_responsable(child_id)
    AND (
      parent_id IS NULL
      OR parent_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.responsables moi
        JOIN public.responsables auteur ON auteur.child_id = moi.child_id AND auteur.foyer_id = moi.foyer_id
        WHERE moi.child_id = agenda_events.child_id AND moi.user_id = (SELECT auth.uid())
          AND auteur.user_id = agenda_events.parent_id
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.responsables r WHERE r.child_id = agenda_events.child_id AND r.user_id = agenda_events.parent_id
      )
    )
  );
