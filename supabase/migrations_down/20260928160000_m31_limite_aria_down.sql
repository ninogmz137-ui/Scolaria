-- Inverse de M31 : supprime la limite quotidienne d'appels à Aria (les compteurs sont perdus).
-- ATTENTION : l'Edge Function « aria » déployée appelle aria_reserver : la redéployer SANS limite avant d'appliquer ceci.
DROP FUNCTION IF EXISTS public.aria_rendre(uuid);
DROP FUNCTION IF EXISTS public.aria_reserver(uuid, integer);
DROP TABLE IF EXISTS public.aria_usage_quotidien;
