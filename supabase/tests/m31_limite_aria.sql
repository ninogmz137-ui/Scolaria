-- Tests M31 · limite quotidienne d'appels à Aria. À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m31_limite_aria.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now());

DO $$
DECLARE r record; n int;
BEGIN
  -- T1 : sous la limite (3) : 1, 2, 3 autorisés, compteur croissant.
  FOR n IN 1..3 LOOP
    SELECT * INTO r FROM public.aria_reserver('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3);
    IF NOT r.autorise OR r.utilises <> n THEN RAISE EXCEPTION 'ÉCHEC T1 appel % : autorise=%, utilises=%', n, r.autorise, r.utilises; END IF;
  END LOOP;
  -- T2 : le 4e est refusé, le compteur ne bouge pas (3), et reste refusé.
  FOR n IN 1..2 LOOP
    SELECT * INTO r FROM public.aria_reserver('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3);
    IF r.autorise OR r.utilises <> 3 THEN RAISE EXCEPTION 'ÉCHEC T2 refus % : autorise=%, utilises=%', n, r.autorise, r.utilises; END IF;
  END LOOP;
  -- T3 : un autre compte n'est pas touché (compteur propre).
  SELECT * INTO r FROM public.aria_reserver('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 3);
  IF NOT r.autorise OR r.utilises <> 1 THEN RAISE EXCEPTION 'ÉCHEC T3 autre compte : %, %', r.autorise, r.utilises; END IF;
  -- T4 : rendre un appel libère une place (et seulement une).
  PERFORM public.aria_rendre('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  SELECT * INTO r FROM public.aria_reserver('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3);
  IF NOT r.autorise OR r.utilises <> 3 THEN RAISE EXCEPTION 'ÉCHEC T4 après rendu : %, %', r.autorise, r.utilises; END IF;
  SELECT * INTO r FROM public.aria_reserver('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3);
  IF r.autorise THEN RAISE EXCEPTION 'ÉCHEC T4 bis : une seule place devait être libérée'; END IF;
  -- T5 : rendre sans compteur ne crée rien et ne passe pas sous zéro.
  PERFORM public.aria_rendre('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  PERFORM public.aria_rendre('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  PERFORM public.aria_rendre('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  IF (SELECT nb FROM public.aria_usage_quotidien WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5 plancher à 0'; END IF;
  IF EXISTS (SELECT 1 FROM public.aria_usage_quotidien WHERE user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') THEN RAISE EXCEPTION 'ÉCHEC T5 rendu sans compteur a créé une ligne'; END IF;
  -- T6 : le lendemain, le compteur repart de 1 (la veille ne compte pas) ; plus de 7 jours : purgé.
  UPDATE public.aria_usage_quotidien SET jour = jour - 1 WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  SELECT * INTO r FROM public.aria_reserver('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3);
  IF NOT r.autorise OR r.utilises <> 1 THEN RAISE EXCEPTION 'ÉCHEC T6 nouveau jour : %, %', r.autorise, r.utilises; END IF;
  INSERT INTO public.aria_usage_quotidien (user_id, jour, nb) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', (now() AT TIME ZONE 'Europe/Paris')::date - 10, 5);
  PERFORM public.aria_reserver('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3);
  IF EXISTS (SELECT 1 FROM public.aria_usage_quotidien WHERE jour < (now() AT TIME ZONE 'Europe/Paris')::date - 7) THEN RAISE EXCEPTION 'ÉCHEC T6 purge'; END IF;
  -- T7 : paramètres invalides.
  BEGIN PERFORM public.aria_reserver('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 0); RAISE EXCEPTION 'ÉCHEC T7 limite 0 acceptée';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  BEGIN PERFORM public.aria_reserver(NULL, 3); RAISE EXCEPTION 'ÉCHEC T7 compte NULL accepté';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
END $$;

-- T8 : un compte connecté et un anonyme n'ont AUCUN accès (fonctions et table).
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN PERFORM public.aria_reserver('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1000); RAISE EXCEPTION 'ÉCHEC T8 authenticated appelle aria_reserver';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.aria_rendre('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'); RAISE EXCEPTION 'ÉCHEC T8 authenticated appelle aria_rendre';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM public.aria_usage_quotidien; RAISE EXCEPTION 'ÉCHEC T8 authenticated lit la table';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.aria_usage_quotidien SET nb = 0; RAISE EXCEPTION 'ÉCHEC T8 authenticated modifie la table';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN PERFORM public.aria_reserver('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1000); RAISE EXCEPTION 'ÉCHEC T9 anon appelle aria_reserver';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM public.aria_usage_quotidien; RAISE EXCEPTION 'ÉCHEC T9 anon lit la table';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- T10 : le service (Edge Function) y accède.
SET LOCAL ROLE service_role;
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.aria_reserver('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 10);
  IF NOT r.autorise THEN RAISE EXCEPTION 'ÉCHEC T10 service refusé'; END IF;
END $$;
RESET ROLE;

-- T11 : compte supprimé → ses compteurs aussi.
DELETE FROM auth.users WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.aria_usage_quotidien WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN RAISE EXCEPTION 'ÉCHEC T11 compteurs conservés après suppression du compte'; END IF;
END $$;

ROLLBACK;
\echo 'M31 : 11 groupes de tests OK (transaction annulée)'
