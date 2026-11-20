-- Inverse de M41 (devoirs : « Coché par », masqué hors du foyer de l'auteur). La coche elle-même
-- (agenda_events.is_done) est conservée ; seuls l'auteur et l'heure des coches sont perdus.
DROP FUNCTION IF EXISTS public.coches_devoirs(uuid);
DROP TRIGGER IF EXISTS agenda_events_poser_coche ON public.agenda_events;
DROP FUNCTION IF EXISTS public.agenda_events_poser_coche();
DROP TABLE IF EXISTS public.agenda_coches;
