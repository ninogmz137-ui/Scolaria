-- Tests M45 (annuler une absence : foyer de l'auteur, avant son début à 8 h / 13 h heure de Paris) — lot 6.
-- Base LOCALE, données fictives, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m45_annuler_absence.sql
-- Acteurs : T titulaire de la classe d'Eva ; A (auteur) et M responsables d'Eva, MÊME foyer ; J responsable d'Eva dans un
-- AUTRE foyer (parent séparé).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 't@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'm@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'j@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now());
UPDATE public.profiles SET role = 'enseignant' WHERE id = '11111111-1111-4111-8111-111111111111';
INSERT INTO public.ecoles (nom) VALUES ('École lot 6') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CE1', 'CE1 de T', '11111111-1111-4111-8111-111111111111') RETURNING id AS ct \gset

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Eva', 'Test', NULL, 7, 'CE1', 'École lot 6')).id AS eva \gset
RESET ROLE;
UPDATE public.academic_years SET classe_id = :'ct' WHERE student_id = :'eva';
SELECT id AS annee_eva FROM public.academic_years WHERE student_id = :'eva' \gset
SELECT foyer_id AS foyer_a FROM public.responsables WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND child_id = :'eva' \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_a', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', :'eva');
INSERT INTO public.foyers (nom, created_by) VALUES ('Foyer de J', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') RETURNING id AS foyer_j \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_j', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'eva');

-- A signale trois absences : demain (annulable), hier (commencée), après-demain (pour les autres contrôles) ; justificatif
-- sur celle de demain.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
VALUES (:'eva', (now() AT TIME ZONE 'Europe/Paris')::date + 1, 'journee', 'maladie', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') RETURNING id AS demain \gset
INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
VALUES (:'eva', (now() AT TIME ZONE 'Europe/Paris')::date - 1, 'journee', 'maladie', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') RETURNING id AS hier \gset
INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
VALUES (:'eva', (now() AT TIME ZONE 'Europe/Paris')::date + 2, 'apres_midi', 'autre', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') RETURNING id AS apres \gset
RESET ROLE;
SELECT :'eva' || '/' || :'annee_eva' || '/' || gen_random_uuid() || '.pdf' AS f \gset
INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('carnet', :'f', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.absences_justificatifs (absence_id, chemin, depose_par) VALUES (:'demain', :'f', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
RESET ROLE;
SELECT set_config('test.demain', :'demain', true) \gset
SELECT set_config('test.hier', :'hier', true) \gset
SELECT set_config('test.apres', :'apres', true) \gset

-- T1 : J (autre foyer) ne peut pas annuler (aucune ligne visible pour la mise à jour).
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  UPDATE public.absences SET statut = 'annulée' WHERE id = current_setting('test.demain')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'T1 : J (autre foyer) a annulé l''absence'; END IF;
  RAISE NOTICE 'T1 OK : un parent d''un autre foyer ne peut pas annuler';
END $$;
RESET ROLE;

-- T2 à T4 : M (même foyer, pas l'auteur).
SELECT set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  -- T2 : M ne peut pas modifier le motif (seul l'auteur modifie).
  BEGIN
    UPDATE public.absences SET motif = 'maladie' WHERE id = current_setting('test.apres')::uuid;
    RAISE EXCEPTION 'T2 : M a modifié le motif d''une absence signalée par A';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T2 OK : un non-auteur ne modifie que par l''annulation';
  -- T3 : annuler ET changer le motif dans la même mise à jour : refusé.
  BEGIN
    UPDATE public.absences SET statut = 'annulée', motif = 'maladie' WHERE id = current_setting('test.apres')::uuid;
    RAISE EXCEPTION 'T3 : annulation + autre modification acceptée';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T3 OK : l''annulation ne change rien d''autre';
  -- T4 : absence commencée (hier) : refusée.
  BEGIN
    UPDATE public.absences SET statut = 'annulée' WHERE id = current_setting('test.hier')::uuid;
    RAISE EXCEPTION 'T4 : absence commencée annulée';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'T4 OK : une absence commencée ne s''annule plus';
END $$;
-- T5 : M annule l'absence de demain : statut, date et auteur posés par la base, justificatif retiré.
UPDATE public.absences SET statut = 'annulée', annulee_par = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' WHERE id = :'demain';
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.absences
    WHERE id = current_setting('test.demain')::uuid AND statut = 'annulée' AND annulee_le IS NOT NULL
      AND annulee_par = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ) THEN RAISE EXCEPTION 'T5 : annulation mal enregistrée (statut, date ou auteur)'; END IF;
  IF EXISTS (SELECT 1 FROM public.absences_justificatifs WHERE absence_id = current_setting('test.demain')::uuid) THEN
    RAISE EXCEPTION 'T5 : le justificatif est resté';
  END IF;
  RAISE NOTICE 'T5 OK : absence annulée par le foyer (auteur posé par la base, pas par l''appelant), justificatif retiré';
END $$;

-- T6 : une absence annulée n'est plus modifiable, même par son auteur.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    UPDATE public.absences SET statut = 'signalée' WHERE id = current_setting('test.demain')::uuid;
    RAISE EXCEPTION 'T6 : absence annulée remise en « signalée »';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- L'auteur garde ses autres modifications sur une absence non annulée.
  UPDATE public.absences SET motif = 'rendez_vous' WHERE id = current_setting('test.apres')::uuid;
  IF (SELECT motif FROM public.absences WHERE id = current_setting('test.apres')::uuid) <> 'rendez_vous' THEN
    RAISE EXCEPTION 'T6 : l''auteur ne peut plus modifier son absence';
  END IF;
  RAISE NOTICE 'T6 OK : annulée = figée ; l''auteur modifie toujours une absence non annulée';
END $$;
RESET ROLE;

-- T7 : le titulaire lit le statut « annulée ».
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT statut FROM public.absences WHERE id = current_setting('test.demain')::uuid) IS DISTINCT FROM 'annulée' THEN
    RAISE EXCEPTION 'T7 : le titulaire ne lit pas « annulée »';
  END IF;
  RAISE NOTICE 'T7 OK : le titulaire lit « annulée »';
END $$;
RESET ROLE;

-- T8 : la fonction de contrôle n'est exécutable par aucun compte ; une seule politique UPDATE.
DO $$ BEGIN
  IF has_function_privilege('authenticated', 'public.absences_controler_modification()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.absences_controler_modification()', 'EXECUTE') THEN
    RAISE EXCEPTION 'T8 : fonction exécutable par un compte';
  END IF;
  IF (SELECT count(*) FROM pg_policy WHERE polrelid = 'public.absences'::regclass AND polcmd = 'w') <> 1 THEN
    RAISE EXCEPTION 'T8 : plusieurs politiques UPDATE sur absences';
  END IF;
  RAISE NOTICE 'T8 OK : fonction non exécutable, une seule politique UPDATE';
END $$;

ROLLBACK;
\echo 'M45 : 8 tests OK'
