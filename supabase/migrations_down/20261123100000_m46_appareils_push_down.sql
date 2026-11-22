-- Inverse de M46 (téléphones et réglages de notification). Supprime les jetons et les réglages (rien d'autre).
BEGIN;
DROP TABLE IF EXISTS public.preferences_notifications;
DROP TRIGGER IF EXISTS appareils_push_un_compte ON public.appareils_push;
DROP FUNCTION IF EXISTS public.appareils_push_un_compte();
DROP TABLE IF EXISTS public.appareils_push;
COMMIT;
