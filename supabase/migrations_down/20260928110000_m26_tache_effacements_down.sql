-- Inverse de M26 : retire les tâches quotidiennes, leurs fonctions et le journal. Les extensions pg_cron /
-- pg_net restent (d'autres usages possibles) ; le secret du Vault est à supprimer à la main s'il n'a plus d'usage.
SELECT cron.unschedule('executer-effacements');
SELECT cron.unschedule('journaliser-effacements');
DROP FUNCTION IF EXISTS public.journaliser_executions_effacement();
DROP FUNCTION IF EXISTS public.lancer_executer_effacements();
DROP TABLE IF EXISTS public.journal_executions_effacement;
