-- Tests M19 · statut d'une année réservé au serveur, unicité, année importée antérieure.
-- À lancer sur une base LOCALE (supabase start) : données de test propres, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m19_statut_annee_serveur.sql
-- Date de référence : create_child crée l'année en cours (current_school_year()). Les millésimes des
-- tests sont calculés à partir d'elle (passé = -1, futur = +1).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- ─── Données de test (postgres) ─────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
  ('11111111-1111-4111-8111-111111111111', 'parent1@test.local', 'authenticated', 'authenticated', '{}'),
  ('33333333-3333-4333-8333-333333333333', 'prof1@test.local',   'authenticated', 'authenticated', '{}');

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS lucas FROM public.create_child('Lucas', 'Test', NULL, 10, 'CM2', 'École test') \gset
RESET ROLE;
SELECT id AS ay_lucas, annee_scolaire AS en_cours FROM public.academic_years WHERE student_id = :'lucas' \gset
\echo 'OK T0 create_child (droits serveur) crée l''année active' :en_cours

INSERT INTO public.ecoles (nom) VALUES ('École test') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', '2025-2026', 'CM1', 'CM1 A', '33333333-3333-4333-8333-333333333333') RETURNING id AS classe \gset

SELECT set_config('test.lucas', :'lucas', true), set_config('test.ay_lucas', :'ay_lucas', true),
       set_config('test.classe', :'classe', true) \gset

-- Millésimes relatifs à l'année en cours
CREATE TEMP TABLE m (passe text, passe2 text, futur text) ON COMMIT DROP;
INSERT INTO m SELECT
  (left(:'en_cours', 4)::int - 1) || '-' || left(:'en_cours', 4),
  (left(:'en_cours', 4)::int - 2) || '-' || (left(:'en_cours', 4)::int - 1),
  (left(:'en_cours', 4)::int + 1) || '-' || (left(:'en_cours', 4)::int + 2);
GRANT SELECT ON m TO authenticated;

-- ─── T1-T11 · parent1 ───────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_lucas uuid := current_setting('test.lucas')::uuid;
  v_ay uuid := current_setting('test.ay_lucas')::uuid;
  v_passe text; v_passe2 text; v_futur text; v_en_cours text; v_imp uuid;
BEGIN
  SELECT passe, passe2, futur INTO v_passe, v_passe2, v_futur FROM m;
  SELECT annee_scolaire INTO v_en_cours FROM public.academic_years WHERE id = v_ay;

  BEGIN
    UPDATE public.academic_years SET statut = 'archivée' WHERE id = v_ay;
    RAISE EXCEPTION 'ÉCHEC T1 parent a archivé l''année en cours';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T1 parent refusé : modifier le statut (active → archivée)';
  END;
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut) VALUES (v_lucas, v_passe, 'CM1', 'active');
    RAISE EXCEPTION 'ÉCHEC T2 parent a créé une année active';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T2 parent refusé : créer une année « active »';
  END;
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut) VALUES (v_lucas, v_passe, 'CM1', 'archivée');
    RAISE EXCEPTION 'ÉCHEC T3 parent a créé une année archivée';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T3 parent refusé : créer une année « archivée »';
  END;
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau) VALUES (v_lucas, v_passe, 'CM1');
    RAISE EXCEPTION 'ÉCHEC T3b parent a créé une année sans statut (défaut active)';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T3b parent refusé : créer une année sans statut (défaut « active »)';
  END;

  INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut)
    VALUES (v_lucas, v_passe, 'CM1', 'importée') RETURNING id INTO v_imp;
  RAISE NOTICE 'OK T4 parent accepté : importer une année passée (%)', v_passe;

  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut) VALUES (v_lucas, v_en_cours, 'CM2', 'importée');
    RAISE EXCEPTION 'ÉCHEC T5 import du millésime en cours accepté';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T5 parent refusé : importer le millésime en cours (%)', v_en_cours;
  END;
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut) VALUES (v_lucas, v_futur, '6ème', 'importée');
    RAISE EXCEPTION 'ÉCHEC T6 import d''une année future accepté';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T6 parent refusé : importer une année future (%)', v_futur;
  END;
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut, classe_id)
      VALUES (v_lucas, v_passe2, 'CE2', 'importée', current_setting('test.classe')::uuid);
    RAISE EXCEPTION 'ÉCHEC T7 import avec classe_id accepté';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T7 parent refusé : importer une année avec un classe_id (M18)';
  END;
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut) VALUES (v_lucas, v_passe, 'CM1', 'importée');
    RAISE EXCEPTION 'ÉCHEC T8 deux années pour le même millésime';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK T8 refusé : deux années pour le même enfant et le même millésime';
  END;
  BEGIN
    UPDATE public.academic_years SET annee_scolaire = v_futur WHERE id = v_imp;
    RAISE EXCEPTION 'ÉCHEC T9 année importée déplacée dans le futur';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T9 parent refusé : déplacer une année importée dans le futur';
  END;
  BEGIN
    UPDATE public.academic_years SET statut = 'archivée' WHERE id = v_imp;
    RAISE EXCEPTION 'ÉCHEC T10 parent a changé le statut d''une année importée';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T10 parent refusé : modifier le statut d''une année importée';
  END;
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut) VALUES (v_lucas, '2019-2021', 'CP', 'importée');
    RAISE EXCEPTION 'ÉCHEC T11 millésime mal formé accepté';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T11 refusé : millésime mal formé (2019-2021)';
  END;
  UPDATE public.academic_years SET etablissement = 'École Voltaire (Marseille)' WHERE id = v_ay;
  RAISE NOTICE 'OK T12 parent : modification ordinaire (établissement) toujours possible';
END $$;
RESET ROLE;

-- ─── T13-T14 · enseignant (prof1) ───────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
UPDATE public.academic_years SET statut = 'archivée' WHERE id = :'ay_lucas';
DO $$ BEGIN
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut)
      VALUES (current_setting('test.lucas')::uuid, '2015-2016', 'CP', 'importée');
    RAISE EXCEPTION 'ÉCHEC T14 enseignant a créé une année';
  -- Le trigger passe avant la RLS : l'enseignant ne voit pas l'année active de l'élève, le contrôle
  -- d'antériorité refuse donc en premier (sinon, la politique d'insertion refuserait).
  EXCEPTION
    WHEN check_violation THEN RAISE NOTICE 'OK T14 enseignant refusé : créer une année (contrôle d''antériorité, avant la RLS)';
    WHEN insufficient_privilege THEN RAISE NOTICE 'OK T14 enseignant refusé : créer une année (RLS)';
  END;
END $$;
RESET ROLE;
SELECT (statut = 'active') AS t13 FROM public.academic_years WHERE id = :'ay_lucas' \gset
\if :t13
  \echo 'OK T13 enseignant : statut inchangé (aucune politique de modification, 0 ligne)'
\else
  \echo 'ÉCHEC T13' ; ROLLBACK; \quit
\endif

-- ─── T15-T16 · serveur (postgres) : passage d'année ─────────────────────────
UPDATE public.academic_years SET statut = 'archivée' WHERE id = :'ay_lucas';
INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut)
  SELECT :'lucas', futur, '6ème', 'active' FROM m;
SELECT count(*) = 1 AS t15 FROM public.academic_years WHERE student_id = :'lucas' AND statut = 'active' \gset
\if :t15
  \echo 'OK T15 serveur : archive l''année en cours et crée la suivante (une seule année active)'
\else
  \echo 'ÉCHEC T15' ; ROLLBACK; \quit
\endif
DO $$ BEGIN
  BEGIN
    INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, statut)
      VALUES (current_setting('test.lucas')::uuid, '2090-2091', 'CP', 'importée');
    RAISE EXCEPTION 'ÉCHEC T16 serveur a importé une année future';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T16 serveur refusé aussi : année importée future (règle pour tous)';
  END;
END $$;

\echo '── Tous les tests M19 sont passés ──'
ROLLBACK;
