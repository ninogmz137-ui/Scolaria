-- Tests M42 (absence signalée : motif rendez-vous, justificatif privé, lecture par le titulaire) — lot 4b.
-- Base LOCALE, données fictives, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m42_absence_signalee.sql
-- Acteurs : T titulaire de la classe d'Eva ; T2 enseignant de la MÊME école, autre classe ; A responsable d'Eva ;
-- B responsable de Félix (autre enfant, même classe qu'Eva).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 't@test.local',  'authenticated', 'authenticated', '{}', now()),
  ('22222222-2222-4222-8222-222222222222', 't2@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local',  'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local',  'authenticated', 'authenticated', '{"role":"parent"}', now());
UPDATE public.profiles SET role = 'enseignant'
 WHERE id IN ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
INSERT INTO public.ecoles (nom) VALUES ('École lot 4b') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CE1', 'CE1 de T', '11111111-1111-4111-8111-111111111111') RETURNING id AS ct \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CE2', 'CE2 de T2', '22222222-2222-4222-8222-222222222222') RETURNING id AS ct2 \gset

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Eva', 'Test', NULL, 7, 'CE1', 'École lot 4b')).id AS eva \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Félix', 'Autre', NULL, 7, 'CE1', 'École lot 4b')).id AS felix \gset
RESET ROLE;
UPDATE public.academic_years SET classe_id = :'ct' WHERE student_id IN (:'eva', :'felix');
SELECT id AS annee_eva FROM public.academic_years WHERE student_id = :'eva' \gset
SELECT id AS annee_felix FROM public.academic_years WHERE student_id = :'felix' \gset
SELECT set_config('test.eva', :'eva', true) \gset
SELECT set_config('test.felix', :'felix', true) \gset

-- Fichiers déposés (comme par l'API Storage) : justificatif de A pour Eva ; fichier PRIVÉ du carnet de A ;
-- fichier de B pour Félix.
SELECT :'eva' || '/' || :'annee_eva' || '/' || gen_random_uuid() || '.pdf' AS justif \gset
SELECT :'eva' || '/' || :'annee_eva' || '/' || gen_random_uuid() || '.jpg' AS prive \gset
SELECT :'felix' || '/' || :'annee_felix' || '/' || gen_random_uuid() || '.pdf' AS justif_b \gset
INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
  ('carnet', :'justif', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('carnet', :'prive', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('carnet', :'justif_b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.carnet_items (child_id, academic_year_id, categorie, fichier, date, ajoute_par, visibilite, titre)
VALUES (:'eva', :'annee_eva', 'souvenir', :'prive', CURRENT_DATE, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'prive', 'Privé');
RESET ROLE;
SELECT set_config('test.justif', :'justif', true) \gset
SELECT set_config('test.prive', :'prive', true) \gset
SELECT set_config('test.justif_b', :'justif_b', true) \gset

-- T1 : A signale une absence d'Eva, motif « rendez-vous », avec justificatif.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par, justificatif_path)
VALUES (:'eva', CURRENT_DATE + 1, 'matin', 'rendez_vous', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', :'justif')
RETURNING id AS abs \gset
SELECT set_config('test.abs', :'abs', true) \gset
DO $$ BEGIN
  IF (SELECT academic_year_id IS NULL FROM public.absences WHERE id = current_setting('test.abs')::uuid) THEN
    RAISE EXCEPTION 'T1 : année de l''absence non posée';
  END IF;
  RAISE NOTICE 'T1 OK : absence « rendez-vous » avec justificatif signalée par A';
END $$;

-- T2 : motif hors liste refusé.
DO $$ BEGIN
  BEGIN
    INSERT INTO public.absences (student_id, motif, signalee_par) VALUES (current_setting('test.eva')::uuid, 'vacances', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'T2 : motif « vacances » accepté';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'T2 OK : motif hors liste refusé';
END $$;

-- T3 : justificatifs falsifiés refusés (fichier privé du carnet, fichier d'un autre enfant, fichier d'un autre compte).
DO $$ BEGIN
  BEGIN
    INSERT INTO public.absences (student_id, motif, signalee_par, justificatif_path)
    VALUES (current_setting('test.eva')::uuid, 'maladie', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_setting('test.prive'));
    RAISE EXCEPTION 'T3 : fichier privé du carnet accepté comme justificatif';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.absences (student_id, motif, signalee_par, justificatif_path)
    VALUES (current_setting('test.eva')::uuid, 'maladie', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_setting('test.justif_b'));
    RAISE EXCEPTION 'T3 : fichier d''un autre enfant accepté';
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T3 OK : fichier privé du carnet et fichier d''un autre enfant refusés';
END $$;
RESET ROLE;

-- T4 : le titulaire T lit l'absence et le justificatif.
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.absences WHERE id = current_setting('test.abs')::uuid) <> 1 THEN
    RAISE EXCEPTION 'T4 : le titulaire ne lit pas l''absence';
  END IF;
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.justif')) <> 1 THEN
    RAISE EXCEPTION 'T4 : le titulaire ne lit pas le justificatif';
  END IF;
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.prive')) <> 0 THEN
    RAISE EXCEPTION 'T4 : le titulaire lit un fichier privé du carnet';
  END IF;
  UPDATE public.absences SET statut = 'prise_en_compte' WHERE id = current_setting('test.abs')::uuid;
  IF (SELECT statut FROM public.absences WHERE id = current_setting('test.abs')::uuid) <> 'signalée' THEN
    RAISE EXCEPTION 'T4 : le titulaire a modifié l''absence';
  END IF;
  RAISE NOTICE 'T4 OK : le titulaire lit l''absence et le justificatif, rien d''autre, sans rien modifier';
END $$;
RESET ROLE;

-- T5 : T2 (autre enseignant de l'école) : ni l'absence ni le justificatif.
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.absences WHERE student_id = current_setting('test.eva')::uuid) <> 0
     OR (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.justif')) <> 0 THEN
    RAISE EXCEPTION 'T5 : un autre enseignant de l''école lit l''absence ou le justificatif';
  END IF;
  RAISE NOTICE 'T5 OK : autre enseignant de l''école refusé (absence et justificatif)';
END $$;
RESET ROLE;

-- T6 : B (parent d'un autre enfant de la même classe) : ni l'absence ni le justificatif.
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.absences WHERE student_id = current_setting('test.eva')::uuid) <> 0
     OR (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.justif')) <> 0 THEN
    RAISE EXCEPTION 'T6 : le parent d''un autre enfant lit l''absence ou le justificatif';
  END IF;
  RAISE NOTICE 'T6 OK : parent d''un autre enfant refusé (absence et justificatif)';
END $$;
RESET ROLE;

-- T7 : un justificatif référencé n'est pas un orphelin ; un fichier non référencé l'est.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.fichiers_orphelins(interval '-1 day') f WHERE f = current_setting('test.justif')) THEN
    RAISE EXCEPTION 'T7 : justificatif référencé compté comme orphelin (il serait supprimé)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fichiers_orphelins(interval '-1 day') f WHERE f = current_setting('test.justif_b')) THEN
    RAISE EXCEPTION 'T7 : fichier non référencé non compté comme orphelin';
  END IF;
  RAISE NOTICE 'T7 OK : nettoyage des orphelins : justificatif conservé, fichier non référencé nettoyé';
END $$;

-- T8 : droits.
DO $$ BEGIN
  IF has_function_privilege('authenticated', 'public.absences_controler_justificatif()', 'execute')
     OR has_function_privilege('anon', 'public.absences_controler_justificatif()', 'execute')
     OR has_function_privilege('authenticated', 'public.fichiers_orphelins(interval)', 'execute') THEN
    RAISE EXCEPTION 'T8 : droits inattendus';
  END IF;
  RAISE NOTICE 'T8 OK : déclencheur et nettoyage non exécutables par un compte';
END $$;

ROLLBACK;
\echo 'M42 : tous les tests passent (transaction annulée).'
