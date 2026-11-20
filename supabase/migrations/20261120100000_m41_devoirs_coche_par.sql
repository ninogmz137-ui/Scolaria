-- M41 — devoirs : « Coché par [prénom] · [heure] » (lot 4a, plan du 20 nov. 2026 dans tasks/todo.md).
-- Inverse : supabase/migrations_down/20261120100000_m41_devoirs_coche_par_down.sql.
--
-- La coche « fait » d'un devoir (agenda_events.is_done) est déjà partagée entre les responsables de l'enfant
-- (politique agenda_update : is_responsable(child_id)). Ce qui manque : QUI a coché et QUAND.
--   - fait_par : responsable qui a coché (FK profiles, ON DELETE SET NULL : un compte effacé ne laisse pas de nom) ;
--   - fait_le  : date et heure de la coche.
-- Les deux colonnes sont posées par le SERVEUR (déclencheur), jamais par l'app : toute valeur envoyée par un
-- client est ignorée. Cocher pose (auth.uid(), now()) ; décocher les vide ; toute autre modification les garde.
-- Aucune politique nouvelle ni modifiée. Advisors : aucun WARN nouveau attendu (fonction de déclencheur
-- SECURITY INVOKER, search_path figé, non appelable comme RPC).

ALTER TABLE public.agenda_events
  ADD COLUMN fait_par uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN fait_le timestamptz;

CREATE INDEX idx_agenda_events_fait_par ON public.agenda_events USING btree (fait_par);

CREATE OR REPLACE FUNCTION public.agenda_events_poser_coche()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_done THEN
      NEW.fait_par := (SELECT auth.uid());
      NEW.fait_le := now();
    ELSE
      NEW.fait_par := NULL;
      NEW.fait_le := NULL;
    END IF;
  ELSIF NEW.is_done IS DISTINCT FROM OLD.is_done THEN
    IF NEW.is_done THEN
      NEW.fait_par := (SELECT auth.uid());
      NEW.fait_le := now();
    ELSE
      NEW.fait_par := NULL;
      NEW.fait_le := NULL;
    END IF;
  ELSE
    -- Coche inchangée : l'auteur et l'heure ne bougent pas. Exception : l'effacement d'un compte
    -- (ON DELETE SET NULL, exécuté par le serveur) peut vider fait_par.
    IF NOT (NEW.fait_par IS NULL AND (SELECT auth.uid()) IS NULL) THEN
      NEW.fait_par := OLD.fait_par;
    END IF;
    NEW.fait_le := OLD.fait_le;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.agenda_events_poser_coche() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER agenda_events_poser_coche BEFORE INSERT OR UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.agenda_events_poser_coche();

COMMENT ON COLUMN public.agenda_events.fait_par IS
  'Responsable qui a coché « fait » (posé par le déclencheur agenda_events_poser_coche, jamais par l''app). M41.';
COMMENT ON COLUMN public.agenda_events.fait_le IS
  'Date et heure de la coche « fait » (posée par le déclencheur). M41.';
