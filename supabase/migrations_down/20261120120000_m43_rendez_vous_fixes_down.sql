-- Inverse de M43 (rendez-vous fixes hebdomadaires). Les rendez-vous, leurs auteurs, leurs coches sont PERDUS.
-- Les règles de modification et de suppression dépendent de rendez_vous_auteurs : retirées en premier.
DROP POLICY IF EXISTS rendez_vous_fixes_update ON public.rendez_vous_fixes;
DROP POLICY IF EXISTS rendez_vous_fixes_delete ON public.rendez_vous_fixes;
DROP TABLE IF EXISTS public.rendez_vous_coches_auteurs;
DROP TABLE IF EXISTS public.rendez_vous_coches;
DROP TABLE IF EXISTS public.rendez_vous_auteurs;
DROP TABLE IF EXISTS public.rendez_vous_fixes;
DROP FUNCTION IF EXISTS public.rendez_vous_coches_poser_auteur();
DROP FUNCTION IF EXISTS public.rendez_vous_poser_auteur();
DROP FUNCTION IF EXISTS public.rendez_vous_fixes_poser();
