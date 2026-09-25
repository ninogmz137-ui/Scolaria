-- Tests M17 · découpage de l'année et échelle des compétences (RLS comprise).
-- À lancer sur une base LOCALE (supabase start) : données de test propres, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m17_suivi_decoupage_echelle.sql
-- Chaque test affiche « OK Tn … » ; le premier échec interrompt le script (ÉCHEC …).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- ─── Données de test (postgres) ─────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
  ('11111111-1111-4111-8111-111111111111', 'parent1@test.local', 'authenticated', 'authenticated', '{}'),
  ('22222222-2222-4222-8222-222222222222', 'parent2@test.local', 'authenticated', 'authenticated', '{}'),
  ('33333333-3333-4333-8333-333333333333', 'prof1@test.local',   'authenticated', 'authenticated', '{}'),
  ('44444444-4444-4444-8444-444444444444', 'prof2@test.local',   'authenticated', 'authenticated', '{}');

-- Enfants créés par parent1 via create_child (enfant + responsable + année)
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT id AS lucas FROM public.create_child('Lucas', 'Test', NULL, 10, 'CM2', 'École test') \gset
SELECT id AS emma  FROM public.create_child('Emma',  'Test', NULL, 13, '3ème', 'Collège test') \gset
RESET ROLE;

SELECT id AS ay_lucas FROM public.academic_years WHERE student_id = :'lucas' \gset
SELECT id AS ay_emma  FROM public.academic_years WHERE student_id = :'emma' \gset
-- Identifiant de Lucas lisible dans les blocs DO (un enseignant ne lit pas la table children).
SELECT set_config('test.lucas', :'lucas', true) \gset

INSERT INTO public.ecoles (nom) VALUES ('École test') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id, decoupage, echelle_competences)
  VALUES (:'ecole', '2026-2027', 'CM2', 'CM2 B', '33333333-3333-4333-8333-333333333333', 'semestres', 3)
  RETURNING id AS classe_reglee \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', '2026-2027', '3ème', '3e B', '44444444-4444-4444-8444-444444444444')
  RETURNING id AS classe_sans_reglage \gset

-- ─── T1 · colonnes et contraintes ───────────────────────────────────────────
DO $$ BEGIN
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND
      (table_name, column_name) IN (('academic_years','decoupage'),('academic_years','echelle_competences'),
       ('classes','decoupage'),('classes','echelle_competences'),('competences','echelle'),('competences','periode'))) <> 6
  THEN RAISE EXCEPTION 'ÉCHEC T1 colonnes'; END IF;
  IF (SELECT is_nullable FROM information_schema.columns WHERE table_name='competences' AND column_name='echelle') <> 'NO'
  THEN RAISE EXCEPTION 'ÉCHEC T1 echelle NOT NULL'; END IF;
  IF (SELECT column_default FROM information_schema.columns WHERE table_name='classes' AND column_name='echelle_competences') IS NOT NULL
  THEN RAISE EXCEPTION 'ÉCHEC T1 classes.echelle_competences sans défaut'; END IF;
  RAISE NOTICE 'OK T1 colonnes, competences.echelle NOT NULL, aucune valeur par défaut sur classes';
END $$;

-- ─── T2 · copie des réglages de la classe au rattachement ───────────────────
UPDATE public.academic_years SET classe_id = :'classe_reglee' WHERE id = :'ay_lucas';
UPDATE public.academic_years SET classe_id = :'classe_sans_reglage' WHERE id = :'ay_emma';
DO $$ DECLARE r record; BEGIN
  SELECT decoupage, echelle_competences INTO r FROM public.academic_years ay
    JOIN public.children c ON c.id = ay.student_id WHERE c.first_name = 'Lucas' AND c.last_name = 'Test';
  IF r.decoupage IS DISTINCT FROM 'semestres' OR r.echelle_competences IS DISTINCT FROM 3
  THEN RAISE EXCEPTION 'ÉCHEC T2 copie depuis la classe réglée (%, %)', r.decoupage, r.echelle_competences; END IF;
  SELECT decoupage, echelle_competences INTO r FROM public.academic_years ay
    JOIN public.children c ON c.id = ay.student_id WHERE c.first_name = 'Emma' AND c.last_name = 'Test';
  IF r.decoupage IS NOT NULL OR r.echelle_competences IS NOT NULL
  THEN RAISE EXCEPTION 'ÉCHEC T2 classe sans réglage → année inchangée (NULL)'; END IF;
  RAISE NOTICE 'OK T2 rattachement : réglages copiés (semestres, 3) ; classe sans réglage → NULL conservé';
END $$;

-- ─── T3 · résolution (parent1, responsable) ─────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.decoupage_annee(:'ay_lucas') AS d_lucas, public.echelle_competences_annee(:'ay_lucas') AS e_lucas,
       public.decoupage_annee(:'ay_emma') AS d_emma, public.echelle_competences_annee(:'ay_emma') AS e_emma \gset
RESET ROLE;
\if :{?d_lucas}
\endif
SELECT (:'d_lucas' = 'semestres' AND :'e_lucas' = '3' AND :'d_emma' = 'trimestres' AND :'e_emma' = '4') AS t3 \gset
\if :t3
  \echo 'OK T3 résolution : Lucas semestres/3 (classe) ; Emma trimestres/4 (défaut 3e, défaut LSU)'
\else
  \echo 'ÉCHEC T3 résolution' :d_lucas :e_lucas :d_emma :e_emma
  ROLLBACK; \quit
\endif

-- ─── T4 · saisie par le titulaire (prof1) ───────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.competences (child_id, academic_year_id, domaine, competence, niveau, echelle, periode)
  VALUES (:'lucas', :'ay_lucas', 'Français', 'Lire à voix haute', 3, 3, 2) RETURNING id AS comp_ecole, source AS src \gset
\echo 'OK T4a titulaire : saisie échelle 3, niveau 3, période 2 acceptée, source =' :src
DO $$ BEGIN
  BEGIN
    INSERT INTO public.competences (child_id, domaine, competence, niveau, echelle)
      SELECT current_setting('test.lucas')::uuid, 'Français', 'x', 4, 3;
    RAISE EXCEPTION 'ÉCHEC T4b niveau 4 sur échelle 3 accepté';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T4b niveau > échelle refusé';
  END;
  BEGIN
    INSERT INTO public.competences (child_id, domaine, competence, niveau)
      SELECT current_setting('test.lucas')::uuid, 'Français', 'x', 2;
    RAISE EXCEPTION 'ÉCHEC T4c compétence sans échelle acceptée';
  EXCEPTION WHEN not_null_violation THEN RAISE NOTICE 'OK T4c compétence sans échelle refusée (NOT NULL)';
  END;
  BEGIN
    INSERT INTO public.competences (child_id, domaine, competence, niveau, echelle)
      SELECT current_setting('test.lucas')::uuid, 'Français', 'x', 2, 5;
    RAISE EXCEPTION 'ÉCHEC T4d échelle 5 acceptée';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T4d échelle hors (3,4) refusée';
  END;
  BEGIN
    INSERT INTO public.competences (child_id, domaine, competence, niveau, echelle, periode)
      SELECT current_setting('test.lucas')::uuid, 'Français', 'x', 2, 3, 3;
    RAISE EXCEPTION 'ÉCHEC T4e période 3 acceptée sur une année en semestres';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T4e période 3 refusée (année en semestres : S1-S2)';
  END;
  BEGIN
    UPDATE public.competences SET echelle = 4 WHERE domaine = 'Français' AND competence = 'Lire à voix haute';
    RAISE EXCEPTION 'ÉCHEC T4f échelle modifiée après saisie';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T4f échelle figée après saisie';
  END;
END $$;
UPDATE public.competences SET niveau = 2 WHERE id = :'comp_ecole';
SELECT niveau AS n_apres FROM public.competences WHERE id = :'comp_ecole' \gset
\echo 'OK T4g titulaire : niveau modifiable (niveau =' :n_apres ')'
RESET ROLE;

-- ─── T5 · autre enseignant (prof2, pas titulaire de Lucas) ──────────────────
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.competences) <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5a prof2 voit les compétences de Lucas'; END IF;
  RAISE NOTICE 'OK T5a prof2 ne voit aucune compétence de Lucas';
  BEGIN
    INSERT INTO public.competences (child_id, domaine, competence, niveau, echelle)
      VALUES (current_setting('test.lucas')::uuid, 'x', 'x', 1, 4);
    RAISE EXCEPTION 'ÉCHEC T5b insertion acceptée';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T5b prof2 ne peut pas saisir pour Lucas (refus 42501)';
  END;
END $$;
SELECT public.decoupage_annee(:'ay_lucas') IS NULL AS t5c \gset
\if :t5c
  \echo 'OK T5c prof2 : decoupage_annee(année de Lucas) = NULL (pas d''accès)'
\else
  \echo 'ÉCHEC T5c' ; ROLLBACK; \quit
\endif
RESET ROLE;

-- ─── T6 · parent1 (responsable) : recopie d'une évaluation papier ──────────
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.competences (child_id, domaine, competence, niveau, echelle, periode)
  VALUES (:'lucas', 'Mathématiques', 'Calculer avec les fractions', 2, 4, 1) RETURNING id AS comp_parent, source AS src_p \gset
\echo 'OK T6a parent : recopie en échelle 4 acceptée, source =' :src_p
UPDATE public.competences SET niveau = 1 WHERE id = :'comp_ecole';
SELECT niveau AS n_ecole FROM public.competences WHERE id = :'comp_ecole' \gset
SELECT (:'n_ecole' = '2') AS t6b \gset
\if :t6b
  \echo 'OK T6b parent : compétence « ecole » non modifiable (inchangée, niveau =' :n_ecole ')'
\else
  \echo 'ÉCHEC T6b parent a modifié une compétence ecole' ; ROLLBACK; \quit
\endif
UPDATE public.competences SET niveau = 3 WHERE id = :'comp_parent';
SELECT count(*) AS vues FROM public.competences \gset
\echo 'OK T6c parent : modifie sa propre recopie ; voit' :vues 'compétences de son enfant'
RESET ROLE;

-- ─── T7 · parent2 (pas responsable) ─────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT count(*) AS vues2, (public.echelle_competences_annee(:'ay_lucas') IS NULL) AS e_null FROM public.competences \gset
SELECT (:'vues2' = '0' AND :'e_null' = 't') AS t7 \gset
\if :t7
  \echo 'OK T7 parent2 : 0 compétence visible, échelle de l''année de Lucas = NULL'
\else
  \echo 'ÉCHEC T7' :vues2 :e_null ; ROLLBACK; \quit
\endif
RESET ROLE;

-- ─── T8 · anon : aucune exécution des fonctions ─────────────────────────────
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.decoupage_annee('00000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'ÉCHEC T8 anon exécute decoupage_annee';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T8 anon ne peut pas exécuter les fonctions de résolution';
  END;
END $$;
RESET ROLE;

-- ─── T9 · périodes sur une année en périodes (P1-P5) ────────────────────────
UPDATE public.academic_years SET decoupage = 'periodes' WHERE id = :'ay_lucas';
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.competences (child_id, academic_year_id, domaine, competence, niveau, echelle, periode)
  VALUES (:'lucas', :'ay_lucas', 'EPS', 'Courir longtemps', 3, 3, 5);
DO $$ BEGIN
  BEGIN
    INSERT INTO public.competences (child_id, domaine, competence, niveau, echelle, periode)
      SELECT current_setting('test.lucas')::uuid, 'EPS', 'x', 1, 3, 6;
    RAISE EXCEPTION 'ÉCHEC T9 période 6 acceptée';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T9 année en périodes : P5 acceptée, P6 refusée';
  END;
END $$;
RESET ROLE;

-- ─── T10 · une évaluation garde son échelle quand l'année change de réglage ─
UPDATE public.academic_years SET echelle_competences = 4 WHERE id = :'ay_lucas';
SELECT echelle AS e_garde FROM public.competences WHERE id = :'comp_ecole' \gset
SELECT (:'e_garde' = '3') AS t10 \gset
\if :t10
  \echo 'OK T10 réglage de l''année passé à 4 : l''évaluation saisie en 3 garde son échelle (archives lisibles)'
\else
  \echo 'ÉCHEC T10' ; ROLLBACK; \quit
\endif

\echo '── Tous les tests M17 sont passés ──'
ROLLBACK;
