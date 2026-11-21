-- Tests M43 (rendez-vous fixes, « À prévoir » par semaine, règles des parents séparés) — lot 4c.
-- Base LOCALE, données fictives, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m43_rendez_vous_fixes.sql
-- Acteurs : A et M responsables d'Eva, MÊME foyer ; J responsable d'Eva dans un AUTRE foyer ; B responsable de Félix ;
-- T enseignant titulaire de la classe d'Eva.

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 't@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{"role":"parent","first_name":"Anne"}', now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'm@test.local', 'authenticated', 'authenticated', '{"role":"parent","first_name":"Marc"}', now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'j@test.local', 'authenticated', 'authenticated', '{"role":"parent","first_name":"Julie"}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now());
UPDATE public.profiles SET role = 'enseignant' WHERE id = '11111111-1111-4111-8111-111111111111';
INSERT INTO public.ecoles (nom) VALUES ('École lot 4c') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CE1', 'CE1 de T', '11111111-1111-4111-8111-111111111111') RETURNING id AS ct \gset

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Eva', 'Test', NULL, 7, 'CE1', 'École lot 4c')).id AS eva \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Félix', 'Autre', NULL, 7, 'CE1', 'École lot 4c')).id AS felix \gset
RESET ROLE;
UPDATE public.academic_years SET classe_id = :'ct' WHERE student_id IN (:'eva', :'felix');
SELECT foyer_id AS foyer_a FROM public.responsables WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND child_id = :'eva' \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_a', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', :'eva');
INSERT INTO public.foyers (nom, created_by) VALUES ('Foyer de J', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') RETURNING id AS foyer_j \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_j', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'eva');
SELECT set_config('test.eva', :'eva', true) \gset

-- T1 : A crée « Piscine · tous les jeudis » ; auteur posé par le serveur ; année posée ; valeurs invalides refusées.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.rendez_vous_fixes (child_id, titre, jour_semaine, categorie, a_prevoir)
VALUES (:'eva', 'Piscine', 4, 'eps', '["Maillot", "Bonnet", "Serviette"]')
RETURNING id AS rdv \gset
SELECT set_config('test.rdv', :'rdv', true) \gset
DO $$ BEGIN
  IF (SELECT cree_par FROM public.rendez_vous_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid)
     IS DISTINCT FROM 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
     OR (SELECT academic_year_id IS NULL FROM public.rendez_vous_fixes WHERE id = current_setting('test.rdv')::uuid) THEN
    RAISE EXCEPTION 'T1 : auteur ou année non posés';
  END IF;
  BEGIN
    INSERT INTO public.rendez_vous_fixes (child_id, titre, jour_semaine) VALUES (current_setting('test.eva')::uuid, 'X', 8);
    RAISE EXCEPTION 'T1 : jour 8 accepté';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rendez_vous_fixes (child_id, titre, jour_semaine, a_prevoir) VALUES (current_setting('test.eva')::uuid, 'X', 2, '[1, 2]');
    RAISE EXCEPTION 'T1 : liste « À prévoir » non textuelle acceptée';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rendez_vous_auteurs (rdv_id, child_id, cree_par) VALUES (gen_random_uuid(), current_setting('test.eva')::uuid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'T1 : auteur écrit directement par un compte';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T1 OK : rendez-vous créé, auteur et année posés par le serveur, valeurs et auteur falsifiés refusés';
END $$;
RESET ROLE;

-- T2 : J (autre foyer) voit le rendez-vous SANS son auteur ; ne peut ni le modifier ni le supprimer ; peut cocher.
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  IF (SELECT count(*) FROM public.rendez_vous_fixes WHERE id = current_setting('test.rdv')::uuid) <> 1 THEN
    RAISE EXCEPTION 'T2 : J ne voit pas le rendez-vous';
  END IF;
  IF (SELECT count(*) FROM public.rendez_vous_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid) <> 0 THEN
    RAISE EXCEPTION 'T2 : J (autre foyer) lit l''auteur du rendez-vous';
  END IF;
  UPDATE public.rendez_vous_fixes SET titre = 'Piscine (J)' WHERE id = current_setting('test.rdv')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'T2 : J (autre foyer) a modifié le rendez-vous'; END IF;
  DELETE FROM public.rendez_vous_fixes WHERE id = current_setting('test.rdv')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'T2 : J (autre foyer) a supprimé le rendez-vous'; END IF;
  INSERT INTO public.rendez_vous_coches (rdv_id, semaine, item) VALUES (current_setting('test.rdv')::uuid, '2026-11-23', 'Bonnet');
  RAISE NOTICE 'T2 OK : J (autre foyer) voit sans l''auteur, coche, mais ne modifie ni ne supprime';
END $$;
RESET ROLE;

-- T3 : M (foyer de l'auteur) lit l'auteur et modifie ; l'enfant ne change pas.
SELECT set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
UPDATE public.rendez_vous_fixes SET titre = 'Piscine (bassin 2)', child_id = gen_random_uuid() WHERE id = :'rdv';
DO $$ BEGIN
  IF (SELECT titre <> 'Piscine (bassin 2)' OR child_id <> current_setting('test.eva')::uuid
      FROM public.rendez_vous_fixes WHERE id = current_setting('test.rdv')::uuid) THEN
    RAISE EXCEPTION 'T3 : M n''a pas pu modifier, ou l''enfant a changé';
  END IF;
  IF (SELECT cree_par FROM public.rendez_vous_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid)
     IS DISTINCT FROM 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid THEN
    RAISE EXCEPTION 'T3 : M (même foyer) ne lit pas l''auteur';
  END IF;
  -- M coche « Maillot » : auteur de la coche posé par le serveur.
  INSERT INTO public.rendez_vous_coches (rdv_id, semaine, item) VALUES (current_setting('test.rdv')::uuid, '2026-11-23', 'Maillot');
  BEGIN
    INSERT INTO public.rendez_vous_coches (rdv_id, semaine, item) VALUES (current_setting('test.rdv')::uuid, '2026-11-24', 'Serviette');
    RAISE EXCEPTION 'T3 : semaine qui ne commence pas un lundi acceptée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rendez_vous_coches_auteurs (rdv_id, semaine, item, fait_par) VALUES (current_setting('test.rdv')::uuid, '2026-11-23', 'Bonnet', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
    RAISE EXCEPTION 'T3 : auteur de coche écrit directement';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- Coche de J (autre foyer) : M la voit (« Fait ») sans son auteur.
  IF (SELECT count(*) FROM public.rendez_vous_coches WHERE item = 'Bonnet') <> 1
     OR (SELECT count(*) FROM public.rendez_vous_coches_auteurs WHERE item = 'Bonnet') <> 0 THEN
    RAISE EXCEPTION 'T3 : coche de J invisible, ou son auteur lisible par M';
  END IF;
  RAISE NOTICE 'T3 OK : M (foyer de l''auteur) lit l''auteur et modifie ; coche de J vue sans son auteur';
END $$;
RESET ROLE;

-- T4 : A lit la coche de M avec son auteur ; J la voit sans auteur.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rendez_vous_coches_auteurs WHERE item = 'Maillot' AND fait_par = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') <> 1 THEN
    RAISE EXCEPTION 'T4 : A ne lit pas la coche de M avec son auteur';
  END IF;
  RAISE NOTICE 'T4 OK : A (même foyer) lit « Coché par Marc »';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rendez_vous_coches WHERE item = 'Maillot') <> 1
     OR (SELECT count(*) FROM public.rendez_vous_coches_auteurs WHERE item = 'Maillot') <> 0 THEN
    RAISE EXCEPTION 'T4 : J ne voit pas la coche partagée, ou lit son auteur';
  END IF;
  DELETE FROM public.rendez_vous_coches WHERE item = 'Maillot';
  IF (SELECT count(*) FROM public.rendez_vous_coches WHERE item = 'Maillot') <> 0 THEN
    RAISE EXCEPTION 'T4 : J n''a pas pu décocher (coche partagée)';
  END IF;
  RAISE NOTICE 'T4 OK : J voit et décoche la coche partagée, sans son auteur';
END $$;
RESET ROLE;

-- T5 : B (autre famille) et T (enseignant) : rien.
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.rendez_vous_fixes WHERE child_id = current_setting('test.eva')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'T5 : B voit les rendez-vous d''Eva'; END IF;
  BEGIN
    INSERT INTO public.rendez_vous_coches (rdv_id, semaine, item) VALUES (current_setting('test.rdv')::uuid, '2026-11-30', 'Maillot');
    RAISE EXCEPTION 'T5 : B a coché';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.rendez_vous_fixes (child_id, titre, jour_semaine) VALUES (current_setting('test.eva')::uuid, 'Intrus', 1);
    RAISE EXCEPTION 'T5 : B a créé un rendez-vous pour Eva';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T5 OK : parent d''un autre enfant : rien';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rendez_vous_fixes) <> 0 OR (SELECT count(*) FROM public.rendez_vous_coches) <> 0
     OR (SELECT count(*) FROM public.rendez_vous_auteurs) <> 0 THEN
    RAISE EXCEPTION 'T5 : l''enseignant voit les rendez-vous de la famille';
  END IF;
  RAISE NOTICE 'T5 OK : enseignant : rien';
END $$;
RESET ROLE;

-- T6 : J crée son propre rendez-vous : lui seul (son foyer) le modifie ; A ne peut pas.
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.rendez_vous_fixes (child_id, titre, jour_semaine) VALUES (:'eva', 'Judo', 3) RETURNING id AS rdv_j \gset
SELECT set_config('test.rdv_j', :'rdv_j', true) \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  UPDATE public.rendez_vous_fixes SET titre = 'Judo (A)' WHERE id = current_setting('test.rdv_j')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'T6 : A a modifié le rendez-vous créé par J (autre foyer)'; END IF;
  IF (SELECT count(*) FROM public.rendez_vous_auteurs WHERE rdv_id = current_setting('test.rdv_j')::uuid) <> 0 THEN
    RAISE EXCEPTION 'T6 : A lit l''auteur du rendez-vous de J';
  END IF;
  RAISE NOTICE 'T6 OK : rendez-vous de J : A le voit, sans auteur, ne le modifie pas';
END $$;
RESET ROLE;

-- T7 : auteur qui n'est plus responsable de l'enfant : tout responsable peut modifier.
DELETE FROM public.responsables WHERE user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' AND child_id = :'eva';
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  UPDATE public.rendez_vous_fixes SET titre = 'Judo (repris)' WHERE id = current_setting('test.rdv_j')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'T7 : rendez-vous d''un auteur parti non modifiable'; END IF;
  RAISE NOTICE 'T7 OK : auteur parti : le rendez-vous reste modifiable par les responsables';
END $$;
RESET ROLE;

-- T8 : M (foyer de l'auteur) supprime ; tout part en cascade ; droits.
SELECT set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DELETE FROM public.rendez_vous_fixes WHERE id = :'rdv';
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.rendez_vous_fixes WHERE id = current_setting('test.rdv')::uuid)
     OR EXISTS (SELECT 1 FROM public.rendez_vous_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid)
     OR EXISTS (SELECT 1 FROM public.rendez_vous_coches WHERE rdv_id = current_setting('test.rdv')::uuid)
     OR EXISTS (SELECT 1 FROM public.rendez_vous_coches_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid) THEN
    RAISE EXCEPTION 'T8 : suppression incomplète';
  END IF;
  IF has_function_privilege('authenticated', 'public.rendez_vous_fixes_poser()', 'execute')
     OR has_function_privilege('authenticated', 'public.rendez_vous_poser_auteur()', 'execute')
     OR has_function_privilege('authenticated', 'public.rendez_vous_coches_poser_auteur()', 'execute')
     OR has_table_privilege('authenticated', 'public.rendez_vous_auteurs', 'insert')
     OR has_table_privilege('authenticated', 'public.rendez_vous_auteurs', 'update')
     OR has_table_privilege('authenticated', 'public.rendez_vous_coches_auteurs', 'insert')
     OR has_table_privilege('authenticated', 'public.rendez_vous_coches', 'update')
     OR has_table_privilege('anon', 'public.rendez_vous_fixes', 'select') THEN
    RAISE EXCEPTION 'T8 : droits inattendus';
  END IF;
  RAISE NOTICE 'T8 OK : M (foyer de l''auteur) supprime, en cascade ; droits fermés';
END $$;

ROLLBACK;
\echo 'M43 : tous les tests passent (transaction annulée).'
