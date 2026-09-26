-- Tests M20 · stockage des fichiers du carnet (bucket privé « carnet »).
-- À lancer sur une base LOCALE (supabase start, avec storage) : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m20_stockage_carnet.sql
-- Les dépôts sont simulés par des INSERT dans storage.objects sous le rôle authenticated (mêmes
-- politiques que l'API Storage, qui écrit avec le JWT de l'utilisateur).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- ─── Comptes : A et B responsables de Lucas (même foyer), C autre foyer, T enseignant de la classe ─
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 't@test.local', 'authenticated', 'authenticated', '{}');

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS lucas FROM public.create_child('Lucas', 'Test', NULL, 10, 'CM2', 'École test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS zoe FROM public.create_child('Zoé', 'Autre', NULL, 9, 'CM1', 'École test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset

SELECT id AS ay_lucas FROM public.academic_years WHERE student_id = :'lucas' \gset
SELECT id AS ay_zoe FROM public.academic_years WHERE student_id = :'zoe' \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', child_id, 'parent' FROM public.responsables WHERE child_id = :'lucas';
-- T est le titulaire de la classe de Lucas (rattachement fait par le serveur).
INSERT INTO public.ecoles (nom) VALUES ('École test') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', (SELECT annee_scolaire FROM public.academic_years WHERE id = :'ay_lucas'), 'CM2', 'CM2 B', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
  RETURNING id AS classe \gset
UPDATE public.academic_years SET classe_id = :'classe' WHERE id = :'ay_lucas';

SELECT :'lucas' || '/' || :'ay_lucas' || '/11111111-1111-4111-8111-111111111111.jpg' AS f_foyer,
       :'lucas' || '/' || :'ay_lucas' || '/22222222-2222-4222-8222-222222222222.pdf' AS f_prive,
       :'lucas' || '/' || :'ay_lucas' || '/33333333-3333-4333-8333-333333333333.png' AS f_seul \gset
SELECT set_config('test.lucas', :'lucas', true), set_config('test.ay_lucas', :'ay_lucas', true),
       set_config('test.zoe', :'zoe', true), set_config('test.ay_zoe', :'ay_zoe', true),
       set_config('test.f_foyer', :'f_foyer', true), set_config('test.f_prive', :'f_prive', true),
       set_config('test.f_seul', :'f_seul', true) \gset

-- ─── T1-T3 · dépôts ─────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE u text := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
    ('carnet', current_setting('test.f_foyer'), u),
    ('carnet', current_setting('test.f_prive'), u),
    ('carnet', current_setting('test.f_seul'), u);
  RAISE NOTICE 'OK T1 A dépose 3 fichiers sous Lucas / son année';
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
      ('carnet', current_setting('test.zoe') || '/' || current_setting('test.ay_zoe') || '/44444444-4444-4444-8444-444444444444.jpg', u);
    RAISE EXCEPTION 'ÉCHEC T2a A a déposé sous l''enfant d''un autre foyer';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T2a refusé : déposer sous l''enfant d''un autre foyer';
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
      ('carnet', current_setting('test.lucas') || '/' || current_setting('test.ay_zoe') || '/55555555-5555-4555-8555-555555555555.jpg', u);
    RAISE EXCEPTION 'ÉCHEC T2b année d''un autre enfant acceptée';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T2b refusé : année qui n''est pas celle de l''enfant';
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
      ('carnet', current_setting('test.lucas') || '/' || current_setting('test.ay_lucas') || '/66666666-6666-4666-8666-666666666666.exe', u);
    RAISE EXCEPTION 'ÉCHEC T2c extension .exe acceptée';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T2c refusé : extension non autorisée (.exe)';
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
      ('carnet', current_setting('test.lucas') || '/' || current_setting('test.ay_lucas') || '/77777777-7777-4777-8777-777777777777.jpg', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'ÉCHEC T2d dépôt au nom d''un autre accepté';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T2d refusé : déposer au nom d''un autre (owner_id)';
  END;

  INSERT INTO public.carnet_items (child_id, categorie, titre, fichier, ajoute_par, visibilite)
    VALUES (current_setting('test.lucas')::uuid, 'souvenir', 'Dessin', current_setting('test.f_foyer'), u::uuid, 'foyer');
  INSERT INTO public.carnet_items (child_id, categorie, titre, fichier, ajoute_par, visibilite)
    VALUES (current_setting('test.lucas')::uuid, 'livret', 'Livret', current_setting('test.f_prive'), u::uuid, 'prive');
  RAISE NOTICE 'OK T3 A crée ses lignes (foyer + privé) avec ses fichiers';
  BEGIN
    INSERT INTO public.carnet_items (child_id, categorie, titre, fichier, ajoute_par)
      VALUES (current_setting('test.lucas')::uuid, 'souvenir', 'Doublon', current_setting('test.f_foyer'), u::uuid);
    RAISE EXCEPTION 'ÉCHEC T3b deux lignes pour le même fichier';
  EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'OK T3b refusé : deux lignes pour le même fichier';
  END;
END $$;
RESET ROLE;

-- ─── T4-T8 · lecture ────────────────────────────────────────────────────────
CREATE TEMP TABLE vu (qui text, n int) ON COMMIT DROP;
GRANT INSERT, SELECT ON vu TO authenticated, anon;

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO vu SELECT 'A', count(*) FROM storage.objects WHERE bucket_id = 'carnet';
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO vu SELECT 'B', count(*) FROM storage.objects WHERE bucket_id = 'carnet';
INSERT INTO vu SELECT 'B_prive', count(*) FROM storage.objects WHERE name = current_setting('test.f_prive');
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO vu SELECT 'C', count(*) FROM storage.objects WHERE bucket_id = 'carnet';
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO vu SELECT 'T', count(*) FROM storage.objects WHERE bucket_id = 'carnet';
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true) \gset
SET LOCAL ROLE anon;
INSERT INTO vu SELECT 'anon', count(*) FROM storage.objects WHERE bucket_id = 'carnet';
RESET ROLE;

SELECT (SELECT n FROM vu WHERE qui = 'A') = 3 AS t4 \gset
\if :t4
  \echo 'OK T4 A (auteur) lit ses 3 fichiers : 2 référencés (foyer + privé) + 1 sans ligne (le sien, pour pouvoir le supprimer)'
\else
  \echo 'ÉCHEC T4' ; ROLLBACK; \quit
\endif
SELECT (SELECT n FROM vu WHERE qui = 'B') = 1 AND (SELECT n FROM vu WHERE qui = 'B_prive') = 0 AS t5 \gset
\if :t5
  \echo 'OK T5 B (co-responsable) lit le fichier « foyer », pas le fichier « privé » de A'
\else
  \echo 'ÉCHEC T5' ; ROLLBACK; \quit
\endif
SELECT (SELECT n FROM vu WHERE qui = 'C') = 0 AS t6 \gset
\if :t6
  \echo 'OK T6 C (autre foyer) : aucun fichier'
\else
  \echo 'ÉCHEC T6' ; ROLLBACK; \quit
\endif
SELECT (SELECT n FROM vu WHERE qui = 'T') = 0 AS t7 \gset
\if :t7
  \echo 'OK T7 enseignant titulaire de la classe : aucun fichier (V1)'
\else
  \echo 'ÉCHEC T7' ; ROLLBACK; \quit
\endif
SELECT (SELECT n FROM vu WHERE qui = 'anon') = 0 AS t8 \gset
\if :t8
  \echo 'OK T8 anonyme : aucun fichier'
\else
  \echo 'ÉCHEC T8' ; ROLLBACK; \quit
\endif

-- ─── T9-T12 · références et suppressions ────────────────────────────────────
-- storage.protect_delete interdit le DELETE SQL direct ; l'API Storage lève ce garde-fou avec
-- storage.allow_delete_query avant de supprimer (sous le JWT de l'utilisateur) : on fait de même,
-- la politique carnet_fichiers_suppression s'applique alors comme en réel.
SELECT set_config('storage.allow_delete_query', 'true', true) \gset
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.carnet_items (child_id, categorie, titre, fichier, ajoute_par, visibilite)
      VALUES (current_setting('test.lucas')::uuid, 'souvenir', 'Copie', current_setting('test.f_seul'), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'foyer');
    RAISE EXCEPTION 'ÉCHEC T9 B a référencé un fichier déposé par A';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T9 refusé : B référence un fichier déposé par A (pour le rendre visible)';
  END;
  DELETE FROM storage.objects WHERE name = current_setting('test.f_foyer');
  IF FOUND THEN RAISE EXCEPTION 'ÉCHEC T10 B a supprimé le fichier de A'; END IF;
  RAISE NOTICE 'OK T10 B ne peut pas supprimer le fichier de A (0 ligne)';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.carnet_items (child_id, academic_year_id, categorie, titre, fichier, ajoute_par)
      VALUES (current_setting('test.lucas')::uuid, current_setting('test.ay_lucas')::uuid, 'souvenir', 'Mal rangé',
              current_setting('test.zoe') || '/' || current_setting('test.ay_zoe') || '/88888888-8888-4888-8888-888888888888.jpg',
              'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'ÉCHEC T11 fichier rangé sous un autre enfant accepté';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T11 refusé : ligne dont le fichier est rangé sous un autre enfant';
  END;
  DELETE FROM storage.objects WHERE name = current_setting('test.f_seul');
  IF NOT FOUND THEN RAISE EXCEPTION 'ÉCHEC T12 A n''a pas pu supprimer son fichier'; END IF;
  RAISE NOTICE 'OK T12 A supprime son propre fichier';
END $$;
RESET ROLE;

\echo '── Tous les tests M20 sont passés ──'
ROLLBACK;
