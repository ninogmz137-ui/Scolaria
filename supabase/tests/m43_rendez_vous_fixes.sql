-- Tests M43 (rendez-vous fixes, « À prévoir » par semaine, règle des parents séparés) — lot 4c.
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

-- T1 : A crée « Piscine · tous les jeudis » ; cree_par imposé par le client ignoré ; année posée.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.rendez_vous_fixes (child_id, titre, jour_semaine, categorie, a_prevoir, cree_par)
VALUES (:'eva', 'Piscine', 4, 'eps', '["Maillot", "Bonnet", "Serviette"]', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
RETURNING id AS rdv \gset
SELECT set_config('test.rdv', :'rdv', true) \gset
DO $$ BEGIN
  IF (SELECT cree_par IS DISTINCT FROM 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid OR academic_year_id IS NULL
      FROM public.rendez_vous_fixes WHERE id = current_setting('test.rdv')::uuid) THEN
    RAISE EXCEPTION 'T1 : auteur imposé par le client, ou année non posée';
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
  RAISE NOTICE 'T1 OK : rendez-vous créé, auteur et année posés par le serveur, valeurs invalides refusées';
END $$;
RESET ROLE;

-- T2 : M (même foyer) et J (autre foyer) modifient ; personne ne change l'auteur ni l'enfant.
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
UPDATE public.rendez_vous_fixes SET titre = 'Piscine (bassin 2)', cree_par = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
 WHERE id = :'rdv';
DO $$ BEGIN
  IF (SELECT titre <> 'Piscine (bassin 2)' OR cree_par <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      FROM public.rendez_vous_fixes WHERE id = current_setting('test.rdv')::uuid) THEN
    RAISE EXCEPTION 'T2 : J n''a pas pu modifier, ou a changé l''auteur';
  END IF;
  RAISE NOTICE 'T2 OK : tout responsable modifie (J, autre foyer, compris) ; auteur infalsifiable';
END $$;
RESET ROLE;

-- T3 : M coche « Maillot » pour une semaine ; la coche est partagée ; l'auteur se lit dans le foyer seulement.
SELECT set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.rendez_vous_coches (rdv_id, semaine, item) VALUES (:'rdv', '2026-11-23', 'Maillot');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.rendez_vous_coches (rdv_id, semaine, item) VALUES (current_setting('test.rdv')::uuid, '2026-11-24', 'Bonnet');
    RAISE EXCEPTION 'T3 : semaine qui ne commence pas un lundi acceptée';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF (SELECT fait_par FROM public.rendez_vous_coches_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid AND item = 'Maillot')
     IS DISTINCT FROM 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid THEN
    RAISE EXCEPTION 'T3 : M ne lit pas sa coche';
  END IF;
  BEGIN
    INSERT INTO public.rendez_vous_coches_auteurs (rdv_id, semaine, item, fait_par) VALUES (current_setting('test.rdv')::uuid, '2026-11-23', 'Maillot', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'T3 : auteur écrit directement par un compte';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T3 OK : M coche « Maillot » (semaine du 23 nov.) ; auteur posé par le serveur, infalsifiable';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rendez_vous_coches WHERE rdv_id = current_setting('test.rdv')::uuid) <> 1
     OR (SELECT count(*) FROM public.rendez_vous_coches_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid AND fait_par = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') <> 1 THEN
    RAISE EXCEPTION 'T3 : A (même foyer) ne voit pas la coche de M avec son auteur';
  END IF;
  RAISE NOTICE 'T3 OK : A (même foyer) voit la coche et son auteur';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rendez_vous_coches WHERE rdv_id = current_setting('test.rdv')::uuid) <> 1 THEN
    RAISE EXCEPTION 'T4 : J (autre foyer) ne voit pas la coche partagée';
  END IF;
  IF (SELECT count(*) FROM public.rendez_vous_coches_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid) <> 0 THEN
    RAISE EXCEPTION 'T4 : J (autre foyer) lit l''auteur de la coche';
  END IF;
  -- J décoche (coche partagée) : l'auteur part avec la coche.
  DELETE FROM public.rendez_vous_coches WHERE rdv_id = current_setting('test.rdv')::uuid AND item = 'Maillot';
  INSERT INTO public.rendez_vous_coches (rdv_id, semaine, item) VALUES (current_setting('test.rdv')::uuid, '2026-11-23', 'Bonnet');
  IF (SELECT fait_par FROM public.rendez_vous_coches_auteurs WHERE item = 'Bonnet') IS DISTINCT FROM 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid THEN
    RAISE EXCEPTION 'T4 : J ne lit pas sa propre coche';
  END IF;
  RAISE NOTICE 'T4 OK : J (autre foyer) voit et modifie la coche partagée, sans l''auteur ; lit sa propre coche';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rendez_vous_coches WHERE rdv_id = current_setting('test.rdv')::uuid) <> 1
     OR (SELECT count(*) FROM public.rendez_vous_coches WHERE item = 'Maillot') <> 0 THEN
    RAISE EXCEPTION 'T5 : A ne voit pas l''état partagé (Maillot décoché, Bonnet coché)';
  END IF;
  IF (SELECT count(*) FROM public.rendez_vous_coches_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid) <> 0 THEN
    RAISE EXCEPTION 'T5 : A lit l''auteur d''une coche de J (autre foyer)';
  END IF;
  RAISE NOTICE 'T5 OK : A voit la coche de J (« Fait »), sans son auteur';
END $$;
RESET ROLE;

-- T6 : B (autre famille) et T (enseignant) : rien, ni lecture ni écriture.
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.rendez_vous_fixes WHERE child_id = current_setting('test.eva')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'T6 : B voit les rendez-vous d''Eva'; END IF;
  UPDATE public.rendez_vous_fixes SET titre = 'piraté' WHERE id = current_setting('test.rdv')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'T6 : B a modifié un rendez-vous d''Eva'; END IF;
  BEGIN
    INSERT INTO public.rendez_vous_coches (rdv_id, semaine, item) VALUES (current_setting('test.rdv')::uuid, '2026-11-30', 'Maillot');
    RAISE EXCEPTION 'T6 : B a coché';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T6 OK : parent d''un autre enfant : rien';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rendez_vous_fixes) <> 0 OR (SELECT count(*) FROM public.rendez_vous_coches) <> 0 THEN
    RAISE EXCEPTION 'T6 : l''enseignant voit les rendez-vous fixes de la famille';
  END IF;
  RAISE NOTICE 'T6 OK : enseignant : rien (rendez-vous de la famille)';
END $$;
RESET ROLE;

-- T7 : J supprime (tout responsable) ; coches et auteurs partent avec ; droits.
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DELETE FROM public.rendez_vous_fixes WHERE id = :'rdv';
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.rendez_vous_fixes WHERE id = current_setting('test.rdv')::uuid)
     OR EXISTS (SELECT 1 FROM public.rendez_vous_coches WHERE rdv_id = current_setting('test.rdv')::uuid)
     OR EXISTS (SELECT 1 FROM public.rendez_vous_coches_auteurs WHERE rdv_id = current_setting('test.rdv')::uuid) THEN
    RAISE EXCEPTION 'T7 : suppression incomplète';
  END IF;
  IF has_function_privilege('authenticated', 'public.rendez_vous_fixes_poser()', 'execute')
     OR has_function_privilege('authenticated', 'public.rendez_vous_coches_poser_auteur()', 'execute')
     OR has_table_privilege('authenticated', 'public.rendez_vous_coches_auteurs', 'insert')
     OR has_table_privilege('authenticated', 'public.rendez_vous_coches', 'update')
     OR has_table_privilege('anon', 'public.rendez_vous_fixes', 'select') THEN
    RAISE EXCEPTION 'T7 : droits inattendus';
  END IF;
  RAISE NOTICE 'T7 OK : suppression par tout responsable, en cascade ; droits fermés';
END $$;

ROLLBACK;
\echo 'M43 : tous les tests passent (transaction annulée).'
