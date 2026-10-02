-- M26 · Tâche quotidienne d'effacement (L7, D6) : chaque nuit à 3 h 30 (UTC), appelle l'Edge Function
-- « executer-effacements » (effacements échus + fichiers orphelins), puis, à 3 h 40, journalise le résultat.
--
-- La clé service n'est JAMAIS écrite ici : elle est lue au moment de l'appel dans le Vault (secret
-- « cle_service_effacements », saisi par le responsable du projet dans le tableau de bord). Sans ce secret,
-- l'appel part sans clé et la fonction répond 401 : rien n'est effacé, et le journal le montre (« echec »).
-- L'URL du projet est lue dans le secret « url_projet » du Vault s'il existe, sinon celle de Paris.
--
-- Journal (journal_executions_effacement) : date, compteurs, succès ou échec — AUCUNE donnée personnelle
-- (ni identifiant d'enfant ou de compte, ni nom, ni chemin de fichier). Illisible par l'app (aucune policy).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.journal_executions_effacement (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lance_le    timestamptz NOT NULL DEFAULT now(),
  requete_id  bigint,
  statut      text NOT NULL DEFAULT 'lancee' CHECK (statut IN ('lancee', 'succes', 'echec')),
  code_http   integer,
  dues        integer,
  executees   integer,
  echecs      integer,
  fichiers    integer,
  orphelins   integer,
  raison      text  -- courte, sans donnée personnelle (« non_autorise », « reponse_absente », « echecs_partiels »…)
);
ALTER TABLE public.journal_executions_effacement ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.journal_executions_effacement FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.lancer_executer_effacements()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cle text;
  v_url text;
  v_req bigint;
BEGIN
  SELECT decrypted_secret INTO v_cle FROM vault.decrypted_secrets WHERE name = 'cle_service_effacements';
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'url_projet';
  v_req := net.http_post(
    url := coalesce(v_url, 'https://nmizwmymhqleasnxcyvu.supabase.co') || '/functions/v1/executer-effacements',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || coalesce(v_cle, '')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  INSERT INTO public.journal_executions_effacement (requete_id, raison)
  VALUES (v_req, CASE WHEN v_cle IS NULL THEN 'secret_absent' END);
  RETURN v_req;
END;
$function$;

-- Lit la réponse de l'appel (pg_net la garde quelques heures) et complète les lignes « lancee ».
CREATE OR REPLACE FUNCTION public.journaliser_executions_effacement()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  j record;
  r record;
  b jsonb;
  n integer := 0;
BEGIN
  FOR j IN SELECT * FROM public.journal_executions_effacement WHERE statut = 'lancee' ORDER BY id LOOP
    SELECT status_code, content, error_msg INTO r FROM net._http_response WHERE id = j.requete_id;
    IF NOT FOUND THEN
      -- Réponse pas encore arrivée : on attend 30 minutes, puis on conclut à l'échec.
      IF j.lance_le < now() - interval '30 minutes' THEN
        UPDATE public.journal_executions_effacement SET statut = 'echec', raison = coalesce(raison, 'reponse_absente') WHERE id = j.id;
        n := n + 1;
      END IF;
      CONTINUE;
    END IF;
    BEGIN
      b := r.content::jsonb;
    EXCEPTION WHEN others THEN
      b := '{}'::jsonb;
    END;
    UPDATE public.journal_executions_effacement SET
      code_http = r.status_code,
      dues = (b ->> 'dues')::integer,
      executees = (b ->> 'executees')::integer,
      echecs = (b ->> 'echecs')::integer,
      fichiers = (b ->> 'fichiers')::integer,
      orphelins = (b ->> 'orphelins')::integer,
      statut = CASE WHEN r.status_code = 200 AND coalesce((b ->> 'echecs')::integer, 1) = 0 THEN 'succes' ELSE 'echec' END,
      raison = coalesce(raison, CASE
        WHEN r.status_code = 401 THEN 'non_autorise'
        WHEN r.status_code = 200 THEN CASE WHEN coalesce((b ->> 'echecs')::integer, 1) > 0 THEN 'echecs_partiels' END
        WHEN r.status_code IS NULL THEN 'pas_de_reponse'
        ELSE 'erreur_http' END)
    WHERE id = j.id;
    n := n + 1;
  END LOOP;
  -- Le journal ne grossit pas indéfiniment : 400 jours.
  DELETE FROM public.journal_executions_effacement WHERE lance_le < now() - interval '400 days';
  RETURN n;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.lancer_executer_effacements() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.journaliser_executions_effacement() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('executer-effacements', '30 3 * * *', 'select public.lancer_executer_effacements()');
SELECT cron.schedule('journaliser-effacements', '40 3 * * *', 'select public.journaliser_executions_effacement()');
