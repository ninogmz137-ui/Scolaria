-- Inverse de M47 (file des notifications et déclencheurs). Les éléments en attente sont perdus (aucune donnée du carnet).
BEGIN;
DROP TRIGGER IF EXISTS notifications_sur_absence ON public.absences;
DROP TRIGGER IF EXISTS notifications_sur_message ON public.teacher_messages;
DROP TRIGGER IF EXISTS notifications_sur_mot ON public.mot_carnets;
DROP FUNCTION IF EXISTS public.notifications_sur_absence();
DROP FUNCTION IF EXISTS public.notifications_sur_message();
DROP FUNCTION IF EXISTS public.notifications_sur_mot();
DROP FUNCTION IF EXISTS public.notifications_nom(uuid);
DROP FUNCTION IF EXISTS public.notifications_ajouter(uuid, uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.notifications_moment(uuid, timestamptz);
DROP TABLE IF EXISTS public.notifications_file;
COMMIT;
