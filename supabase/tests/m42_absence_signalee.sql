-- Tests M42 (absence signalée : motif rendez-vous, lecture par le titulaire, justificatif par FOYER) — lot 4b.
-- Base LOCALE, données fictives, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m42_absence_signalee.sql
-- Acteurs : T titulaire de la classe d'Eva ; T2 enseignant de la MÊME école, autre classe ;
-- A et M responsables d'Eva, MÊME foyer ; J responsable d'Eva dans un AUTRE foyer (parent séparé) ;
-- B responsable de Félix (autre enfant, même classe).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 't@test.local',  'authenticated', 'authenticated', '{}', now()),
  ('22222222-2222-4222-8222-222222222222', 't2@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local',  'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'm@test.local',  'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'j@test.local',  'authenticated', 'authenticated', '{"role":"parent"}', now()),
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
SELECT foyer_id AS foyer_a FROM public.responsables WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND child_id = :'eva' \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_a', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', :'eva');
INSERT INTO public.foyers (nom, created_by) VALUES ('Foyer de J', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') RETURNING id AS foyer_j \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_j', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'eva');
SELECT set_config('test.eva', :'eva', true) \gset

-- Fichiers déposés (comme par l'API Storage).
SELECT :'eva' || '/' || :'annee_eva' || '/' || gen_random_uuid() || '.pdf' AS f_m \gset
SELECT :'eva' || '/' || :'annee_eva' || '/' || gen_random_uuid() || '.pdf' AS f_j \gset
SELECT :'eva' || '/' || :'annee_eva' || '/' || gen_random_uuid() || '.pdf' AS f_a_par_m \gset
SELECT :'eva' || '/' || :'annee_eva' || '/' || gen_random_uuid() || '.jpg' AS prive \gset
SELECT :'felix' || '/' || :'annee_felix' || '/' || gen_random_uuid() || '.pdf' AS f_b \gset
INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
  ('carnet', :'f_m', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
  ('carnet', :'f_j', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  ('carnet', :'f_a_par_m', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('carnet', :'prive', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('carnet', :'f_b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
SELECT set_config('test.f_m', :'f_m', true) \gset
SELECT set_config('test.f_j', :'f_j', true) \gset
SELECT set_config('test.f_a_par_m', :'f_a_par_m', true) \gset
SELECT set_config('test.prive', :'prive', true) \gset
SELECT set_config('test.f_b', :'f_b', true) \gset
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.carnet_items (child_id, academic_year_id, categorie, fichier, date, ajoute_par, visibilite, titre)
VALUES (:'eva', :'annee_eva', 'souvenir', :'prive', CURRENT_DATE, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'prive', 'Privé');

-- T1 : A signale une absence d'Eva, motif « rendez-vous » ; motif hors liste refusé.
INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
VALUES (:'eva', CURRENT_DATE + 1, 'matin', 'rendez_vous', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
RETURNING id AS abs \gset
SELECT set_config('test.abs', :'abs', true) \gset
DO $$ BEGIN
  BEGIN
    INSERT INTO public.absences (student_id, motif, signalee_par) VALUES (current_setting('test.eva')::uuid, 'vacances', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'T1 : motif « vacances » accepté';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'T1 OK : absence « rendez-vous » signalée par A ; motif hors liste refusé';
END $$;
RESET ROLE;

-- T2 : J (autre foyer) voit l'absence mais ne peut pas la justifier.
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.absences WHERE id = current_setting('test.abs')::uuid) <> 1 THEN
    RAISE EXCEPTION 'T2 : J (responsable, autre foyer) ne voit pas l''absence';
  END IF;
  BEGIN
    INSERT INTO public.absences_justificatifs (absence_id, chemin, depose_par)
    VALUES (current_setting('test.abs')::uuid, current_setting('test.f_j'), 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    RAISE EXCEPTION 'T2 : J (autre foyer) a joint un justificatif';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T2 OK : J (autre foyer) voit l''absence, ne peut pas la justifier';
END $$;
RESET ROLE;

-- T3 : M (même foyer que A) justifie l'absence signalée par A ; les falsifications sont refusées.
SELECT set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.absences_justificatifs (absence_id, chemin, depose_par)
    VALUES (current_setting('test.abs')::uuid, current_setting('test.f_b'), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
    RAISE EXCEPTION 'T3 : fichier d''un autre enfant accepté';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.absences_justificatifs (absence_id, chemin, depose_par)
    VALUES (current_setting('test.abs')::uuid, current_setting('test.f_a_par_m'), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
    RAISE EXCEPTION 'T3 : fichier déposé par un autre compte accepté';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.absences_justificatifs (absence_id, chemin, depose_par)
    VALUES (current_setting('test.abs')::uuid, current_setting('test.f_m'), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'T3 : dépôt au nom d''un autre accepté';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO public.absences_justificatifs (absence_id, chemin, depose_par)
  VALUES (current_setting('test.abs')::uuid, current_setting('test.f_m'), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
  RAISE NOTICE 'T3 OK : M (même foyer) justifie l''absence signalée par A ; fichier d''un autre enfant, d''un autre compte, dépôt au nom d''un autre refusés';
END $$;
RESET ROLE;

-- T4 : A (foyer de l'auteur) lit la ligne et le fichier ; J (autre foyer) ni l'une ni l'autre.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.absences_justificatifs WHERE absence_id = current_setting('test.abs')::uuid) <> 1
     OR (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.f_m')) <> 1 THEN
    RAISE EXCEPTION 'T4 : A ne lit pas le justificatif joint par M';
  END IF;
  -- Le carnet privé de A n'est pas un justificatif.
  BEGIN
    UPDATE public.absences_justificatifs SET chemin = current_setting('test.prive'), depose_par = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     WHERE absence_id = current_setting('test.abs')::uuid;
    RAISE EXCEPTION 'T4 : fichier privé du carnet accepté comme justificatif';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T4 OK : A lit le justificatif ; un fichier du carnet est refusé';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.absences_justificatifs WHERE absence_id = current_setting('test.abs')::uuid) <> 0
     OR (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.f_m')) <> 0 THEN
    RAISE EXCEPTION 'T4 : J (autre foyer) voit le justificatif';
  END IF;
  RAISE NOTICE 'T4 OK : J (autre foyer) ne voit ni le justificatif ni le fichier';
END $$;
RESET ROLE;

-- T5 : le titulaire T lit l'absence, le justificatif et le fichier ; ne modifie rien.
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.absences WHERE id = current_setting('test.abs')::uuid) <> 1
     OR (SELECT count(*) FROM public.absences_justificatifs WHERE absence_id = current_setting('test.abs')::uuid) <> 1
     OR (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.f_m')) <> 1 THEN
    RAISE EXCEPTION 'T5 : le titulaire ne lit pas l''absence ou son justificatif';
  END IF;
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.prive')) <> 0 THEN
    RAISE EXCEPTION 'T5 : le titulaire lit un fichier privé du carnet';
  END IF;
  UPDATE public.absences SET statut = 'prise_en_compte' WHERE id = current_setting('test.abs')::uuid;
  IF (SELECT statut FROM public.absences WHERE id = current_setting('test.abs')::uuid) <> 'signalée' THEN
    RAISE EXCEPTION 'T5 : le titulaire a modifié l''absence';
  END IF;
  RAISE NOTICE 'T5 OK : le titulaire lit l''absence et le justificatif, rien d''autre, sans rien modifier';
END $$;
RESET ROLE;

-- T6 : T2 (autre enseignant de l'école) et B (parent d'un autre enfant) : rien.
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.absences WHERE student_id = current_setting('test.eva')::uuid) <> 0
     OR (SELECT count(*) FROM public.absences_justificatifs) <> 0
     OR (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.f_m')) <> 0 THEN
    RAISE EXCEPTION 'T6 : un autre enseignant de l''école lit l''absence ou le justificatif';
  END IF;
  RAISE NOTICE 'T6 OK : autre enseignant de l''école refusé';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.absences WHERE student_id = current_setting('test.eva')::uuid) <> 0
     OR (SELECT count(*) FROM public.absences_justificatifs) <> 0
     OR (SELECT count(*) FROM storage.objects WHERE bucket_id = 'carnet' AND name = current_setting('test.f_m')) <> 0 THEN
    RAISE EXCEPTION 'T6 : le parent d''un autre enfant lit l''absence ou le justificatif';
  END IF;
  RAISE NOTICE 'T6 OK : parent d''un autre enfant refusé';
END $$;
RESET ROLE;

-- T7 : nettoyage et effacement.
DO $$ DECLARE v_demande uuid; BEGIN
  IF EXISTS (SELECT 1 FROM public.fichiers_orphelins(interval '-1 day') f WHERE f = current_setting('test.f_m')) THEN
    RAISE EXCEPTION 'T7 : justificatif référencé compté comme orphelin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fichiers_orphelins(interval '-1 day') f WHERE f = current_setting('test.f_j')) THEN
    RAISE EXCEPTION 'T7 : fichier non référencé non compté comme orphelin';
  END IF;
  -- M demande l'effacement de son compte : son dépôt qui justifie l'absence de A RESTE.
  INSERT INTO public.demandes_effacement (portee, user_id) VALUES ('compte', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') RETURNING id INTO v_demande;
  IF EXISTS (SELECT 1 FROM public.fichiers_a_effacer(v_demande) f WHERE f = current_setting('test.f_m')) THEN
    RAISE EXCEPTION 'T7 : effacement du compte de M : le justificatif de l''absence de A serait supprimé';
  END IF;
  RAISE NOTICE 'T7 OK : justificatif conservé par le nettoyage et par l''effacement du compte qui l''a déposé';
END $$;

-- T8 : droits.
DO $$ BEGIN
  IF has_function_privilege('authenticated', 'public.absences_justificatifs_controler()', 'execute')
     OR has_function_privilege('anon', 'public.absences_justificatifs_controler()', 'execute')
     OR has_table_privilege('anon', 'public.absences_justificatifs', 'select')
     OR has_table_privilege('authenticated', 'public.absences_justificatifs', 'delete') THEN
    RAISE EXCEPTION 'T8 : droits inattendus';
  END IF;
  RAISE NOTICE 'T8 OK : déclencheur non exécutable, aucun droit anon, aucune suppression de justificatif';
END $$;

ROLLBACK;
\echo 'M42 : tous les tests passent (transaction annulée).'
