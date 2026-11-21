-- Tests M41 (devoirs : « Coché par », masqué hors du foyer de l'auteur) — lot 4a, règle du 20 nov. 2026.
-- Base LOCALE, données fictives, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m41_devoirs_coche_par.sql
-- Acteurs : A et B responsables d'Eva, MÊME foyer ; J responsable d'Eva dans un AUTRE foyer (parent séparé) ;
-- C responsable de Félix (autre famille).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{"role":"parent","first_name":"Anne"}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{"role":"parent","first_name":"Bruno"}', now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'j@test.local', 'authenticated', 'authenticated', '{"role":"parent","first_name":"Julie"}', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now());

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
INSERT INTO public.foyers (nom, created_by) VALUES ('Foyer de J', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') RETURNING id AS foyer_j \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_j', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'eva');
SELECT set_config('test.eva', :'eva', true) \gset

-- Lecture d'une coche, par le compte courant, via coches_devoirs.
CREATE FUNCTION pg_temp.coche(p_event uuid) RETURNS TABLE (fait_par uuid, fait_le timestamptz) LANGUAGE sql AS $$
  SELECT c.fait_par, c.fait_le FROM public.coches_devoirs(current_setting('test.eva')::uuid) c WHERE c.event_id = p_event $$;

-- T1 : A crée un devoir non fait → aucune coche.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.agenda_events (child_id, parent_id, title, event_type, start_time, is_done)
VALUES (:'eva', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Lire p. 12', 'devoir', now() + interval '1 day', false)
RETURNING id AS d \gset
SELECT set_config('test.d', :'d', true) \gset
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_temp.coche(current_setting('test.d')::uuid)) THEN RAISE EXCEPTION 'T1 : coche sans avoir coché'; END IF;
  RAISE NOTICE 'T1 OK : devoir non fait, aucune coche';
END $$;
RESET ROLE;

-- T2 : B (même foyer) coche → auteur B, heure posée.
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
UPDATE public.agenda_events SET is_done = true WHERE id = :'d';
DO $$ BEGIN
  IF (SELECT fait_par IS DISTINCT FROM 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid OR fait_le IS NULL FROM pg_temp.coche(current_setting('test.d')::uuid)) IS NOT FALSE THEN
    RAISE EXCEPTION 'T2 : B ne lit pas sa propre coche';
  END IF;
  RAISE NOTICE 'T2 OK : B coche, lit sa coche (auteur et heure)';
END $$;
RESET ROLE;

-- T3 : A (même foyer que B) lit l'auteur et l'heure, et le prénom (responsables_enfant).
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE v_prenom text; BEGIN
  SELECT r.prenom INTO v_prenom FROM pg_temp.coche(current_setting('test.d')::uuid) c
    JOIN public.responsables_enfant(current_setting('test.eva')::uuid) r ON r.user_id = c.fait_par;
  IF v_prenom IS DISTINCT FROM 'Bruno' OR (SELECT fait_le FROM pg_temp.coche(current_setting('test.d')::uuid)) IS NULL THEN
    RAISE EXCEPTION 'T3 : A (même foyer) ne lit pas « Coché par Bruno · heure » (lu : %)', v_prenom;
  END IF;
  RAISE NOTICE 'T3 OK : A, du même foyer, lit « Coché par Bruno · heure »';
END $$;
RESET ROLE;

-- T4 : J (autre foyer, même enfant) voit la coche (is_done) mais ni l'auteur ni l'heure.
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT (SELECT is_done FROM public.agenda_events WHERE id = current_setting('test.d')::uuid) THEN
    RAISE EXCEPTION 'T4 : J ne voit pas la coche partagée';
  END IF;
  IF (SELECT count(*) FROM pg_temp.coche(current_setting('test.d')::uuid) WHERE fait_par IS NULL AND fait_le IS NULL) <> 1 THEN
    RAISE EXCEPTION 'T4 : J (autre foyer) lit l''auteur ou l''heure de la coche';
  END IF;
  RAISE NOTICE 'T4 OK : J (autre foyer) voit « Fait », sans auteur ni heure';
END $$;
-- T5 : J coche un devoir → lui voit « Coché par vous » ; A et B (autre foyer pour J) voient « Fait ».
INSERT INTO public.agenda_events (child_id, parent_id, title, event_type, start_time, is_done)
VALUES (:'eva', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Poésie', 'devoir', now() + interval '2 days', true)
RETURNING id AS dj \gset
SELECT set_config('test.dj', :'dj', true) \gset
DO $$ BEGIN
  IF (SELECT fait_par IS DISTINCT FROM 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid OR fait_le IS NULL FROM pg_temp.coche(current_setting('test.dj')::uuid)) IS NOT FALSE THEN
    RAISE EXCEPTION 'T5 : J ne lit pas sa propre coche';
  END IF;
  RAISE NOTICE 'T5 OK : J, auteur, lit sa coche';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM pg_temp.coche(current_setting('test.dj')::uuid) WHERE fait_par IS NULL AND fait_le IS NULL) <> 1 THEN
    RAISE EXCEPTION 'T5 : B lit l''auteur ou l''heure de la coche de J (autre foyer)';
  END IF;
  RAISE NOTICE 'T5 OK : B voit la coche de J comme « Fait »';
END $$;

-- T6 : B décoche son devoir → la coche disparaît.
UPDATE public.agenda_events SET is_done = false WHERE id = :'d';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_temp.coche(current_setting('test.d')::uuid)) THEN RAISE EXCEPTION 'T6 : décoche sans effacer la coche'; END IF;
  RAISE NOTICE 'T6 OK : décoché, auteur et heure effacés';
END $$;
-- T7 : modifier le titre ne touche pas à la coche ; aucun accès direct à agenda_coches.
UPDATE public.agenda_events SET is_done = true WHERE id = :'d';
SELECT fait_le AS heure_avant FROM pg_temp.coche(:'d') \gset
UPDATE public.agenda_events SET title = 'Lire p. 12 et 13' WHERE id = :'d';
SELECT set_config('test.heure_avant', :'heure_avant', true) \gset
DO $$ BEGIN
  IF (SELECT fait_le FROM pg_temp.coche(current_setting('test.d')::uuid)) IS DISTINCT FROM current_setting('test.heure_avant')::timestamptz THEN
    RAISE EXCEPTION 'T7 : modifier le titre a changé l''heure de la coche';
  END IF;
  BEGIN
    PERFORM 1 FROM public.agenda_coches;
    RAISE EXCEPTION 'T7 : lecture directe de agenda_coches permise';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.agenda_coches (event_id, fait_par) VALUES (current_setting('test.dj')::uuid, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'T7 : écriture directe dans agenda_coches permise (falsification de l''auteur)';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T7 OK : titre modifié sans toucher à la coche ; agenda_coches ni lisible ni modifiable directement';
END $$;
RESET ROLE;

-- T8 : C (autre famille) : aucune coche d'Eva, aucun devoir.
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.coches_devoirs(current_setting('test.eva')::uuid);
  IF n <> 0 THEN RAISE EXCEPTION 'T8 : C lit % coche(s) d''Eva', n; END IF;
  SELECT count(*) INTO n FROM public.agenda_events WHERE child_id = current_setting('test.eva')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'T8 : C voit % devoir(s) d''Eva', n; END IF;
  RAISE NOTICE 'T8 OK : C ne voit ni devoir ni coche d''Eva';
END $$;
RESET ROLE;

-- T11 : règle du 21 nov. — événement créé par A : B (même foyer) le modifie ; J (autre foyer) le voit et le coche,
-- mais ni ne le modifie ni ne le supprime.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.agenda_events (child_id, parent_id, title, event_type, start_time)
VALUES (:'eva', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Zoo', 'sortie', now() + interval '9 days')
RETURNING id AS ev \gset
SELECT set_config('test.ev', :'ev', true) \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
UPDATE public.agenda_events SET title = 'Zoo de Vincennes' WHERE id = :'ev';
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  IF (SELECT title FROM public.agenda_events WHERE id = current_setting('test.ev')::uuid) <> 'Zoo de Vincennes' THEN
    RAISE EXCEPTION 'T11 : B (foyer de l''auteur) n''a pas pu modifier, ou J ne voit pas l''événement';
  END IF;
  BEGIN
    UPDATE public.agenda_events SET title = 'Zoo (J)' WHERE id = current_setting('test.ev')::uuid;
    RAISE EXCEPTION 'T11 : J (autre foyer) a modifié l''événement';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.agenda_events SET is_done = true WHERE id = current_setting('test.ev')::uuid;
  IF NOT (SELECT is_done FROM public.agenda_events WHERE id = current_setting('test.ev')::uuid) THEN
    RAISE EXCEPTION 'T11 : J n''a pas pu cocher (coche partagée)';
  END IF;
  DELETE FROM public.agenda_events WHERE id = current_setting('test.ev')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'T11 : J (autre foyer) a supprimé l''événement'; END IF;
  RAISE NOTICE 'T11 OK : événement de A : B (même foyer) le modifie ; J le voit et le coche, ne le modifie ni ne le supprime';
END $$;
-- J crée son propre événement.
INSERT INTO public.agenda_events (child_id, parent_id, title, event_type, start_time)
VALUES (:'eva', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Judo', 'activite', now() + interval '3 days')
RETURNING id AS ev_j \gset
SELECT set_config('test.ev_j', :'ev_j', true) \gset
RESET ROLE;

-- T12 : A ne modifie pas l'événement de J ; J quitte l'enfant → l'événement devient modifiable ; B supprime celui de A.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    UPDATE public.agenda_events SET title = 'Judo (A)' WHERE id = current_setting('test.ev_j')::uuid;
    RAISE EXCEPTION 'T12 : A a modifié l''événement de J (autre foyer)';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
DELETE FROM public.responsables WHERE user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' AND child_id = :'eva';
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  UPDATE public.agenda_events SET title = 'Judo (repris)' WHERE id = current_setting('test.ev_j')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'T12 : événement d''un auteur parti non modifiable'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  DELETE FROM public.agenda_events WHERE id = current_setting('test.ev')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'T12 : B (foyer de l''auteur) n''a pas pu supprimer'; END IF;
  RAISE NOTICE 'T12 OK : A ne modifie pas l''événement de J ; auteur parti : modifiable ; B supprime l''événement de A';
END $$;
RESET ROLE;
DO $$ BEGIN
  IF has_function_privilege('authenticated', 'public.agenda_events_verrou_foyer()', 'execute') THEN
    RAISE EXCEPTION 'T12 : verrou exécutable par un compte';
  END IF;
END $$;

-- T9 : effacement du compte de B (serveur) → auteur vidé, coche conservée (affichée « Fait »).
SELECT set_config('request.jwt.claims', '', true) \gset
UPDATE public.agenda_events SET parent_id = NULL WHERE parent_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DELETE FROM public.responsables WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DELETE FROM public.profiles WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $$ BEGIN
  IF (SELECT fait_par FROM public.agenda_coches WHERE event_id = current_setting('test.d')::uuid) IS NOT NULL
     OR NOT (SELECT is_done FROM public.agenda_events WHERE id = current_setting('test.d')::uuid) THEN
    RAISE EXCEPTION 'T9 : compte effacé, auteur non vidé ou coche perdue';
  END IF;
  RAISE NOTICE 'T9 OK : compte effacé, auteur vidé, coche conservée';
END $$;

-- T10 : droits.
DO $$ BEGIN
  IF has_function_privilege('authenticated', 'public.agenda_events_poser_coche()', 'execute')
     OR has_function_privilege('anon', 'public.agenda_events_poser_coche()', 'execute')
     OR has_function_privilege('anon', 'public.coches_devoirs(uuid)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.coches_devoirs(uuid)', 'execute')
     OR has_table_privilege('authenticated', 'public.agenda_coches', 'select')
     OR has_table_privilege('anon', 'public.agenda_coches', 'select') THEN
    RAISE EXCEPTION 'T10 : droits inattendus';
  END IF;
  RAISE NOTICE 'T10 OK : déclencheur non exécutable, coches_devoirs pour authenticated seul, agenda_coches fermée';
END $$;

ROLLBACK;
\echo 'M41 : tous les tests passent (transaction annulée).'
