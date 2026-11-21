-- Règle du 21 nov. (foyer de l'auteur) : retirée en premier.
ALTER POLICY agenda_delete ON public.agenda_events USING (public.is_responsable(child_id));
DROP TRIGGER IF EXISTS agenda_events_verrou_foyer ON public.agenda_events;
DROP FUNCTION IF EXISTS public.agenda_events_verrou_foyer();
-- Inverse de M41 (devoirs : « Coché par », masqué hors du foyer de l'auteur). La coche elle-même
-- (agenda_events.is_done) est conservée ; seuls l'auteur et l'heure des coches sont perdus.
DROP FUNCTION IF EXISTS public.coches_devoirs(uuid);
DROP TRIGGER IF EXISTS agenda_events_poser_coche ON public.agenda_events;
DROP FUNCTION IF EXISTS public.agenda_events_poser_coche();
DROP TABLE IF EXISTS public.agenda_coches;
