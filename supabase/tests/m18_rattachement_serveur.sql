-- Tests M18 · rattachement d'une année réservé au serveur.
-- À lancer sur une base LOCALE (supabase start) : données de test propres, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m18_rattachement_serveur.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- ─── Données de test (postgres) ─────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
  ('11111111-1111-4111-8111-111111111111', 'parent1@test.local', 'authenticated', 'authenticated', '{}'),
  ('33333333-3333-4333-8333-333333333333', 'prof1@test.local',   'authenticated', 'authenticated', '{}'),
  ('44444444-4444-4444-8444-444444444444', 'prof2@test.local',   'authenticated', 'authenticated', '{}');

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS lucas FROM public.create_child('Lucas', 'Test', NULL, 10, 'CM2', 'École test') \gset
SELECT id AS emma  FROM public.create_child('Emma',  'Test', NULL, 13, '3ème', 'Collège test') \gset
RESET ROLE;
SELECT id AS ay_lucas FROM public.academic_years WHERE student_id = :'lucas' \gset
SELECT id AS ay_emma  FROM public.academic_years WHERE student_id = :'emma' \gset

INSERT INTO public.ecoles (nom) VALUES ('École test') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', '2026-2027', 'CM2', 'CM2 B', '33333333-3333-4333-8333-333333333333') RETURNING id AS classe_a \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', '2026-2027', 'CM2', 'CM2 A', '44444444-4444-4444-8444-444444444444') RETURNING id AS classe_b \gset

-- ─── T8 · le serveur (postgres) rattache ────────────────────────────────────
UPDATE public.academic_years SET classe_id = :'classe_a' WHERE id = :'ay_lucas';
SELECT (classe_id = :'classe_a') AS t8 FROM public.academic_years WHERE id = :'ay_lucas' \gset
\if :t8
  \echo 'OK T8 serveur : rattachement de l''année de Lucas à la classe A'
\else
  \echo 'ÉCHEC T8' ; ROLLBACK; \quit
\endif

SELECT set_config('test.ay_lucas', :'ay_lucas', true), set_config('test.ay_emma', :'ay_emma', true),
       set_config('test.emma', :'emma', true), set_config('test.classe_a', :'classe_a', true),
       set_config('test.classe_b', :'classe_b', true) \gset

-- ─── T1-T6 · parent1 (responsable des deux enfants) ─────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    UPDATE public.academic_years SET classe_id = current_setting('test.classe_a')::uuid WHERE id = current_setting('test.ay_emma')::uuid;
    RAISE EXCEPTION 'ÉCHEC T1 parent a rattaché Emma';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T1 parent refusé : rattacher (NULL → classe)';
  END;
  BEGIN
    UPDATE public.academic_years SET classe_id = NULL WHERE id = current_setting('test.ay_lucas')::uuid;
    RAISE EXCEPTION 'ÉCHEC T2 parent a détaché Lucas';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T2 parent refusé : détacher (classe → NULL)';
  END;
  BEGIN
    UPDATE public.academic_years SET classe_id = current_setting('test.classe_b')::uuid WHERE id = current_setting('test.ay_lucas')::uuid;
    RAISE EXCEPTION 'ÉCHEC T3 parent a changé la classe de Lucas';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T3 parent refusé : changer de classe (A → B)';
  END;
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, classe_id)
      VALUES (current_setting('test.emma')::uuid, '2027-2028', '2nde', current_setting('test.classe_a')::uuid);
    RAISE EXCEPTION 'ÉCHEC T4a parent a créé une année déjà rattachée';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T4a parent refusé : créer une année déjà rattachée';
  END;
  -- Depuis M19 : une année créée depuis l'app est toujours « importée ».
  INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut)
    VALUES (current_setting('test.emma')::uuid, '2025-2026', '4ème', 'importée');
  RAISE NOTICE 'OK T4b parent : créer une année sans classe (import) reste possible';
  BEGIN
    UPDATE public.academic_years SET student_id = current_setting('test.emma')::uuid WHERE id = current_setting('test.ay_lucas')::uuid;
    RAISE EXCEPTION 'ÉCHEC T5 parent a déplacé l''année de Lucas vers Emma';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T5 parent refusé : déplacer une année vers un autre enfant (student_id)';
  END;
  -- Contournement du verrou M17 en deux requêtes : détacher, puis modifier le découpage.
  BEGIN
    UPDATE public.academic_years SET classe_id = NULL WHERE id = current_setting('test.ay_lucas')::uuid;
    RAISE EXCEPTION 'ÉCHEC T6 étape 1 acceptée';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.academic_years SET decoupage = 'trimestres' WHERE id = current_setting('test.ay_lucas')::uuid;
    RAISE EXCEPTION 'ÉCHEC T6 étape 2 acceptée';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T6 contournement en 2 requêtes : détacher refusé, puis découpage refusé (année toujours rattachée)';
  END;
  UPDATE public.academic_years SET etablissement = 'École Voltaire (Marseille)' WHERE id = current_setting('test.ay_lucas')::uuid;
  RAISE NOTICE 'OK T9 parent : modification ordinaire (établissement) toujours possible';
END $$;
RESET ROLE;

-- ─── T7 · enseignant (prof1) : ne peut rien changer ─────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
UPDATE public.academic_years SET classe_id = NULL WHERE id = :'ay_lucas';
RESET ROLE;
SELECT (classe_id = :'classe_a') AS t7 FROM public.academic_years WHERE id = :'ay_lucas' \gset
\if :t7
  \echo 'OK T7 enseignant : classe_id inchangé (aucune politique de modification, 0 ligne)'
\else
  \echo 'ÉCHEC T7' ; ROLLBACK; \quit
\endif

-- ─── T10 · le serveur détache et change de classe ───────────────────────────
UPDATE public.academic_years SET classe_id = :'classe_b' WHERE id = :'ay_lucas';
UPDATE public.academic_years SET classe_id = NULL WHERE id = :'ay_lucas';
SELECT (classe_id IS NULL) AS t10 FROM public.academic_years WHERE id = :'ay_lucas' \gset
\if :t10
  \echo 'OK T10 serveur : changer de classe puis détacher'
\else
  \echo 'ÉCHEC T10' ; ROLLBACK; \quit
\endif

\echo '── Tous les tests M18 sont passés ──'
ROLLBACK;
