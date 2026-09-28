-- Inverse de M26 : retire la tâche quotidienne et sa fonction. Les extensions pg_cron / pg_net restent
-- (d'autres usages possibles) ; le secret du Vault est à supprimer à la main s'il n'a plus d'usage.
SELECT cron.unschedule('executer-effacements');
DROP FUNCTION IF EXISTS public.lancer_executer_effacements();
