-- M26 · Tâche quotidienne d'effacement (L7, D6) : chaque nuit à 3 h 30 (UTC), appelle l'Edge Function
-- « executer-effacements » (effacements échus + fichiers orphelins).
--
-- La clé service n'est JAMAIS écrite ici : elle est lue au moment de l'appel dans le Vault (secret
-- « cle_service_effacements », saisi par le responsable du projet dans le tableau de bord). Sans ce secret,
-- l'appel part sans clé et la fonction répond 401 : rien n'est effacé.
-- L'URL du projet est lue dans le secret « url_projet » du Vault s'il existe, sinon celle de Paris.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.lancer_executer_effacements()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cle text;
  v_url text;
BEGIN
  SELECT decrypted_secret INTO v_cle FROM vault.decrypted_secrets WHERE name = 'cle_service_effacements';
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'url_projet';
  RETURN net.http_post(
    url := coalesce(v_url, 'https://nmizwmymhqleasnxcyvu.supabase.co') || '/functions/v1/executer-effacements',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || coalesce(v_cle, '')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.lancer_executer_effacements() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('executer-effacements', '30 3 * * *', 'select public.lancer_executer_effacements()');
