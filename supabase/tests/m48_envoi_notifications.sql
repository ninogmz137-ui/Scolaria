-- Tests M48 (envoi des notifications : fonctions du serveur, lanceur, tâches planifiées) — lot 7a.
-- Base LOCALE, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m48_envoi_notifications.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- E1 : fonctions du serveur exécutables par service_role SEUL ; jamais par anon ni authenticated.
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['public.notifications_dues(timestamptz,integer)', 'public.notifications_marquer(uuid[],text)',
    'public.appareils_desactiver(text[])', 'public.notifications_resume(timestamptz)',
    'public.notifications_resume_marquer(uuid[],timestamptz)'] LOOP
    IF has_function_privilege('authenticated', f, 'EXECUTE') OR has_function_privilege('anon', f, 'EXECUTE') THEN
      RAISE EXCEPTION 'E1 : % exécutable par un compte', f;
    END IF;
    IF NOT has_function_privilege('service_role', f, 'EXECUTE') THEN
      RAISE EXCEPTION 'E1 : % refusée au serveur', f;
    END IF;
  END LOOP;
  IF has_function_privilege('authenticated', 'public.lancer_envoyer_notifications(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.lancer_envoyer_notifications(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'E1 : le lanceur est appelable par un compte';
  END IF;
  RAISE NOTICE 'E1 OK : fonctions du serveur réservées à service_role ; lanceur jamais appelable par un compte';
END $$;

-- E2 : sans les secrets du coffre (base locale), le lanceur ne fait AUCUN appel réseau.
DO $$ DECLARE avant bigint := (SELECT count(*) FROM net.http_request_queue); BEGIN
  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cle_service_notifications') THEN
    RAISE NOTICE 'E2 sauté : un secret cle_service_notifications existe dans ce coffre';
  ELSE
    PERFORM public.lancer_envoyer_notifications('file');
    PERFORM public.lancer_envoyer_notifications('resume');
    IF (SELECT count(*) FROM net.http_request_queue) <> avant THEN RAISE EXCEPTION 'E2 : appel réseau sans secrets'; END IF;
    RAISE NOTICE 'E2 OK : sans secrets du coffre, aucun appel (jamais d''adresse par défaut)';
  END IF;
END $$;

-- E3 : tâches planifiées présentes (chaque minute ; 16 h et 17 h UTC).
DO $$ BEGIN
  IF (SELECT schedule FROM cron.job WHERE jobname = 'envoyer-notifications') IS DISTINCT FROM '* * * * *'
     OR (SELECT schedule FROM cron.job WHERE jobname = 'resume-18h-ete') IS DISTINCT FROM '0 16 * * *'
     OR (SELECT schedule FROM cron.job WHERE jobname = 'resume-18h-hiver') IS DISTINCT FROM '0 17 * * *' THEN
    RAISE EXCEPTION 'E3 : tâches planifiées absentes ou fausses';
  END IF;
  RAISE NOTICE 'E3 OK : envoi chaque minute ; résumé à 16 h et 17 h UTC';
END $$;

-- E4 : le résumé ne renvoie rien hors de 18 h heure de Paris (hiver : 17 h UTC = 18 h ; 16 h UTC = 17 h).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.notifications_resume(timestamptz '2026-11-23 16:00:00+00')) THEN
    RAISE EXCEPTION 'E4 : résumé envoyé à 17 h heure de Paris';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notifications_resume(timestamptz '2027-06-10 17:00:00+00')) THEN
    RAISE EXCEPTION 'E4 : résumé envoyé à 19 h heure de Paris (été)';
  END IF;
  RAISE NOTICE 'E4 OK : résumé à 18 h heure de Paris seulement (hiver et été)';
END $$;

-- E5 : les tables du serveur ne sont lisibles par aucun compte.
DO $$ BEGIN
  IF has_table_privilege('authenticated', 'public.notifications_resumes', 'SELECT')
     OR has_table_privilege('authenticated', 'public.notifications_file', 'SELECT') THEN
    RAISE EXCEPTION 'E5 : table du serveur lisible par un compte';
  END IF;
  RAISE NOTICE 'E5 OK : file et résumés illisibles par un compte';
END $$;

ROLLBACK;
\echo 'M48 : 5 tests OK'
