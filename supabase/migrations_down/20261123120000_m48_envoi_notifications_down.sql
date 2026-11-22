-- Inverse de M48 (envoi des notifications) : arrête les tâches, retire les fonctions du serveur et les résumés faits.
BEGIN;
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('envoyer-notifications', 'resume-18h-ete', 'resume-18h-hiver');
DROP FUNCTION IF EXISTS public.lancer_envoyer_notifications(text);
DROP FUNCTION IF EXISTS public.notifications_resume_marquer(uuid[], timestamptz);
DROP FUNCTION IF EXISTS public.notifications_resume(timestamptz);
DROP FUNCTION IF EXISTS public.appareils_desactiver(text[]);
DROP FUNCTION IF EXISTS public.notifications_marquer(uuid[], text);
DROP FUNCTION IF EXISTS public.notifications_dues(timestamptz, integer);
DROP TABLE IF EXISTS public.notifications_resumes;
COMMIT;
