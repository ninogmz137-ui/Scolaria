-- Inverse de M43 (rendez-vous fixes hebdomadaires). Les rendez-vous, leurs coches et leurs auteurs sont PERDUS.
DROP TABLE IF EXISTS public.rendez_vous_coches_auteurs;
DROP TABLE IF EXISTS public.rendez_vous_coches;
DROP TABLE IF EXISTS public.rendez_vous_fixes;
DROP FUNCTION IF EXISTS public.rendez_vous_coches_poser_auteur();
DROP FUNCTION IF EXISTS public.rendez_vous_fixes_poser();
