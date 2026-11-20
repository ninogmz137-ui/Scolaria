-- Inverse de M41 (devoirs : « Coché par »). La coche elle-même (is_done) est conservée ;
-- seuls l'auteur et l'heure de la coche sont perdus.
DROP TRIGGER IF EXISTS agenda_events_poser_coche ON public.agenda_events;
DROP FUNCTION IF EXISTS public.agenda_events_poser_coche();
DROP INDEX IF EXISTS public.idx_agenda_events_fait_par;
ALTER TABLE public.agenda_events
  DROP COLUMN IF EXISTS fait_le,
  DROP COLUMN IF EXISTS fait_par;
