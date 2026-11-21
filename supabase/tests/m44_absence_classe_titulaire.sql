-- Tests M44 (absence refusée par la base sans classe avec titulaire pour l'année en cours) — lot 5.
-- Base LOCALE, données fictives, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m44_absence_classe_titulaire.sql
-- Acteurs : T titulaire de la classe d'Eva ; A responsable d'Eva (classe avec titulaire), de Léo (aucune classe) et
-- de Noé (classe SANS titulaire).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 't@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now());
UPDATE public.profiles SET role = 'enseignant' WHERE id = '11111111-1111-4111-8111-111111111111';
INSERT INTO public.ecoles (nom) VALUES ('École lot 5') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CE1', 'CE1 de T', '11111111-1111-4111-8111-111111111111') RETURNING id AS ct \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CP', 'CP sans titulaire', NULL) RETURNING id AS c_vide \gset

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Eva', 'Test', NULL, 7, 'CE1', 'École lot 5')).id AS eva \gset
SELECT (public.create_child('Léo', 'Test', NULL, 6, 'CP', NULL)).id AS leo \gset
SELECT (public.create_child('Noé', 'Test', NULL, 6, 'CP', 'École lot 5')).id AS noe \gset
RESET ROLE;
UPDATE public.academic_years SET classe_id = :'ct' WHERE student_id = :'eva';
UPDATE public.academic_years SET classe_id = :'c_vide' WHERE student_id = :'noe';
SELECT id AS annee_eva FROM public.academic_years WHERE student_id = :'eva' \gset
-- Année ARCHIVÉE de Léo, rattachée à la classe de T : elle ne compte pas (seule l'année active compte).
INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut, classe_id)
VALUES (:'leo', '2025-2026', 'GS', 'archivée', :'ct') RETURNING id AS archive_leo \gset
SELECT set_config('test.eva', :'eva', true) \gset
SELECT set_config('test.leo', :'leo', true) \gset
SELECT set_config('test.noe', :'noe', true) \gset
SELECT set_config('test.archive_leo', :'archive_leo', true) \gset

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;

-- T1 : Eva (classe avec titulaire) : acceptée, sans année envoyée (comme l'app) et avec l'année active.
INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
VALUES (:'eva', CURRENT_DATE + 1, 'matin', 'maladie', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
RETURNING id AS abs_eva \gset
INSERT INTO public.absences (student_id, academic_year_id, date_debut, demi_journee, motif, signalee_par)
VALUES (:'eva', :'annee_eva', CURRENT_DATE + 2, 'journee', 'rendez_vous', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SELECT set_config('test.abs_eva', :'abs_eva', true) \gset
DO $$ BEGIN RAISE NOTICE 'T1 OK : absence d''Eva (classe avec titulaire) acceptée'; END $$;

DO $$ BEGIN
  -- T2 : Léo, aucune classe pour l'année en cours : refusée.
  BEGIN
    INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
    VALUES (current_setting('test.leo')::uuid, CURRENT_DATE + 1, 'matin', 'maladie', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'T2 : absence de Léo (sans classe) acceptée';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T2 OK : absence de Léo (aucune classe) refusée';

  -- T3 : Léo, en visant son année ARCHIVÉE rattachée à une classe avec titulaire : refusée.
  BEGIN
    INSERT INTO public.absences (student_id, academic_year_id, date_debut, demi_journee, motif, signalee_par)
    VALUES (current_setting('test.leo')::uuid, current_setting('test.archive_leo')::uuid, CURRENT_DATE + 1, 'matin', 'maladie',
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'T3 : absence sur une année archivée acceptée';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T3 OK : année archivée (même avec classe) refusée';

  -- T4 : Noé, classe SANS titulaire : refusée.
  BEGIN
    INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
    VALUES (current_setting('test.noe')::uuid, CURRENT_DATE + 1, 'matin', 'maladie', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'T4 : absence de Noé (classe sans titulaire) acceptée';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T4 OK : classe sans titulaire refusée';

  -- T5 : déplacer l'absence d'Eva vers Léo (UPDATE de l'enfant) : refusé.
  BEGIN
    UPDATE public.absences SET student_id = current_setting('test.leo')::uuid, academic_year_id = NULL
    WHERE id = current_setting('test.abs_eva')::uuid;
    RAISE EXCEPTION 'T5 : absence déplacée vers un enfant sans classe';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T5 OK : déplacement vers un enfant sans classe refusé';
END $$;
RESET ROLE;

-- T6 : la classe d'Eva perd son titulaire : l'absence déjà enregistrée reste modifiable (motif), une nouvelle est refusée.
UPDATE public.classes SET enseignant_id = NULL WHERE id = :'ct';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  UPDATE public.absences SET motif = 'autre' WHERE id = current_setting('test.abs_eva')::uuid;
  IF (SELECT motif FROM public.absences WHERE id = current_setting('test.abs_eva')::uuid) <> 'autre' THEN
    RAISE EXCEPTION 'T6 : absence existante non modifiable';
  END IF;
  BEGIN
    INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
    VALUES (current_setting('test.eva')::uuid, CURRENT_DATE + 3, 'matin', 'maladie', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'T6 : nouvelle absence acceptée sans titulaire';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T6 OK : absence existante modifiable, nouvelle refusée sans titulaire';
END $$;
RESET ROLE;

-- T7 : la fonction de contrôle n'est exécutable par aucun compte.
DO $$ BEGIN
  IF has_function_privilege('authenticated', 'public.absences_verifier_classe()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.absences_verifier_classe()', 'EXECUTE') THEN
    RAISE EXCEPTION 'T7 : absences_verifier_classe exécutable par un compte';
  END IF;
  RAISE NOTICE 'T7 OK : fonction de contrôle non exécutable par un compte';
END $$;

ROLLBACK;
\echo 'M44 : 7 tests OK'
