-- Tests M41 (devoirs : « Coché par ») — lot 4a.
-- Base LOCALE, données fictives, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m41_devoirs_coche_par.sql
-- Acteurs : A et B responsables d'Eva, MÊME foyer ; C responsable de Félix (autre famille).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now());
UPDATE public.profiles SET first_name = 'Anne' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
UPDATE public.profiles SET first_name = 'Bruno' WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Eva', 'Test', NULL, 7, 'CE1', 'École lot 4')).id AS eva \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Félix', 'Autre', NULL, 7, 'CE1', 'École lot 4')).id AS felix \gset
RESET ROLE;
SELECT foyer_id AS foyer_a FROM public.responsables WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND child_id = :'eva' \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_a', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', :'eva');
SELECT set_config('test.eva', :'eva', true) \gset

-- T1 / T2 : A crée un devoir non fait, en essayant d'imposer fait_par = B → le serveur l'ignore.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.agenda_events (child_id, parent_id, title, event_type, start_time, is_done, fait_par, fait_le)
VALUES (:'eva', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Lire p. 12', 'devoir', now() + interval '1 day', false,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now() - interval '3 days')
RETURNING id AS d \gset
SELECT set_config('test.d', :'d', true) \gset
DO $$ BEGIN
  IF (SELECT fait_par IS NOT NULL OR fait_le IS NOT NULL FROM public.agenda_events WHERE id = current_setting('test.d')::uuid) THEN
    RAISE EXCEPTION 'T1/T2 : fait_par / fait_le imposés par le client à la création';
  END IF;
  RAISE NOTICE 'T1/T2 OK : devoir non fait, sans auteur de coche (valeurs du client ignorées)';
END $$;
RESET ROLE;

-- T3 : B (même foyer) coche → fait_par = B, fait_le renseigné.
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
UPDATE public.agenda_events SET is_done = true WHERE id = :'d';
DO $$ BEGIN
  IF (SELECT fait_par IS DISTINCT FROM 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid OR fait_le IS NULL
      FROM public.agenda_events WHERE id = current_setting('test.d')::uuid) THEN
    RAISE EXCEPTION 'T3 : la coche de B n''a pas posé fait_par = B';
  END IF;
  RAISE NOTICE 'T3 OK : B coche, fait_par = B, fait_le posé';
END $$;
RESET ROLE;

-- T4 : A voit la coche de B et son prénom (responsables_enfant).
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE v_prenom text; BEGIN
  SELECT r.prenom INTO v_prenom
    FROM public.agenda_events e
    JOIN public.responsables_enfant(current_setting('test.eva')::uuid) r ON r.user_id = e.fait_par
   WHERE e.id = current_setting('test.d')::uuid AND e.is_done;
  IF v_prenom IS DISTINCT FROM 'Bruno' THEN
    RAISE EXCEPTION 'T4 : A ne lit pas « Coché par Bruno » (lu : %)', v_prenom;
  END IF;
  RAISE NOTICE 'T4 OK : A lit « Coché par Bruno »';
END $$;

-- T5 : A modifie le titre et tente de s'attribuer la coche → l'auteur reste B, l'heure ne bouge pas.
SELECT fait_le AS fait_le_avant FROM public.agenda_events WHERE id = :'d' \gset
SELECT set_config('test.fait_le_avant', :'fait_le_avant', true) \gset
UPDATE public.agenda_events SET title = 'Lire p. 12 et 13', fait_par = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fait_le = now() + interval '1 hour'
 WHERE id = :'d';
DO $$ BEGIN
  IF (SELECT fait_par IS DISTINCT FROM 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
          OR fait_le IS DISTINCT FROM current_setting('test.fait_le_avant')::timestamptz
      FROM public.agenda_events WHERE id = current_setting('test.d')::uuid) THEN
    RAISE EXCEPTION 'T5 : un responsable a falsifié l''auteur ou l''heure de la coche';
  END IF;
  IF (SELECT title FROM public.agenda_events WHERE id = current_setting('test.d')::uuid) <> 'Lire p. 12 et 13' THEN
    RAISE EXCEPTION 'T5 : la modification légitime du titre a été perdue';
  END IF;
  RAISE NOTICE 'T5 OK : auteur et heure de la coche infalsifiables, titre modifié';
END $$;

-- T6 : A décoche → auteur et heure vidés.
UPDATE public.agenda_events SET is_done = false WHERE id = :'d';
DO $$ BEGIN
  IF (SELECT fait_par IS NOT NULL OR fait_le IS NOT NULL FROM public.agenda_events WHERE id = current_setting('test.d')::uuid) THEN
    RAISE EXCEPTION 'T6 : décocher n''a pas vidé fait_par / fait_le';
  END IF;
  RAISE NOTICE 'T6 OK : décoché, auteur et heure vidés';
END $$;

-- T7 : A crée un devoir déjà fait → fait_par = A.
INSERT INTO public.agenda_events (child_id, parent_id, title, event_type, start_time, is_done)
VALUES (:'eva', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Poésie', 'devoir', now() + interval '2 days', true)
RETURNING id AS d2 \gset
SELECT set_config('test.d2', :'d2', true) \gset
DO $$ BEGIN
  IF (SELECT fait_par IS DISTINCT FROM 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid OR fait_le IS NULL
      FROM public.agenda_events WHERE id = current_setting('test.d2')::uuid) THEN
    RAISE EXCEPTION 'T7 : devoir créé fait sans fait_par = A';
  END IF;
  RAISE NOTICE 'T7 OK : devoir créé fait, fait_par = A';
END $$;
UPDATE public.agenda_events SET is_done = true WHERE id = :'d';
RESET ROLE;

-- T8 : C (autre famille) ne voit pas les devoirs d'Eva et ne peut pas les cocher.
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.agenda_events WHERE child_id = current_setting('test.eva')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'T8 : C voit % devoir(s) d''Eva', n; END IF;
  UPDATE public.agenda_events SET is_done = false WHERE id = current_setting('test.d')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'T8 : C a décoché un devoir d''Eva'; END IF;
  RAISE NOTICE 'T8 OK : C ne voit ni ne coche les devoirs d''Eva';
END $$;
RESET ROLE;

-- T9 : effacement du compte de A (serveur) → fait_par vidé sur le devoir qu'il avait coché, coche conservée.
SELECT set_config('request.jwt.claims', '', true) \gset
-- A coche d (le serveur rejoue la coche de A pour le décor).
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
UPDATE public.agenda_events SET is_done = false WHERE id = :'d2';
UPDATE public.agenda_events SET is_done = true WHERE id = :'d2';
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset
UPDATE public.agenda_events SET parent_id = NULL WHERE parent_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DELETE FROM public.responsables WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DELETE FROM public.profiles WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $$ BEGIN
  IF (SELECT fait_par IS NOT NULL OR NOT is_done FROM public.agenda_events WHERE id = current_setting('test.d2')::uuid) THEN
    RAISE EXCEPTION 'T9 : compte effacé, fait_par non vidé ou coche perdue';
  END IF;
  RAISE NOTICE 'T9 OK : compte effacé, auteur de la coche vidé, coche conservée';
END $$;

-- T10 : la fonction du déclencheur n'est pas appelable par un compte.
DO $$ BEGIN
  IF has_function_privilege('authenticated', 'public.agenda_events_poser_coche()', 'execute')
     OR has_function_privilege('anon', 'public.agenda_events_poser_coche()', 'execute') THEN
    RAISE EXCEPTION 'T10 : agenda_events_poser_coche exécutable par un compte';
  END IF;
  RAISE NOTICE 'T10 OK : fonction du déclencheur non exécutable par anon / authenticated';
END $$;

ROLLBACK;
\echo 'M41 : tous les tests passent (transaction annulée).'
