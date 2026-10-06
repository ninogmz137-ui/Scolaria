-- Tests M35 · photo de l'enfant (bucket privé « child-photos », children.photo_path, effacement, nettoyage).
-- Base LOCALE, transaction annulée, comptes fictifs @test.local.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m35_photo_enfant.sql
-- A et B : responsables de Lucas (même foyer) ; C : autre foyer (Zoé) ; T : enseignant de la classe de Lucas.
-- Les dépôts sont simulés par des INSERT dans storage.objects sous le rôle authenticated (mêmes politiques que l'API Storage).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

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

INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', child_id, 'parent' FROM public.responsables WHERE child_id = :'lucas';
SELECT id AS ay_lucas FROM public.academic_years WHERE student_id = :'lucas' \gset
INSERT INTO public.ecoles (nom) VALUES ('École test') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', (SELECT annee_scolaire FROM public.academic_years WHERE id = :'ay_lucas'), 'CM2', 'CM2 B', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
  RETURNING id AS classe \gset
UPDATE public.academic_years SET classe_id = :'classe' WHERE id = :'ay_lucas';

SELECT set_config('test.lucas', :'lucas', true), set_config('test.zoe', :'zoe', true) \gset

-- ─── T0 · bucket privé, JPEG seulement ──────────────────────────────────────
DO $$
DECLARE b storage.buckets%ROWTYPE;
BEGIN
  SELECT * INTO b FROM storage.buckets WHERE id = 'child-photos';
  IF NOT FOUND THEN RAISE EXCEPTION 'ÉCHEC T0 bucket child-photos absent'; END IF;
  IF b.public THEN RAISE EXCEPTION 'ÉCHEC T0 bucket PUBLIC'; END IF;
  IF b.allowed_mime_types IS DISTINCT FROM ARRAY['image/jpeg'] THEN RAISE EXCEPTION 'ÉCHEC T0 types autorisés : %', b.allowed_mime_types; END IF;
  IF b.file_size_limit <> 1048576 THEN RAISE EXCEPTION 'ÉCHEC T0 taille limite %', b.file_size_limit; END IF;
  RAISE NOTICE 'OK T0 bucket privé, JPEG seulement, 1 Mo';
END $$;

-- ─── T1 · A (responsable) dépose la photo de Lucas ; chemins invalides refusés ─
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE u text := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('child-photos', current_setting('test.lucas') || '/avatar.jpg', u);
  RAISE NOTICE 'OK T1a A dépose la photo de Lucas';
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('child-photos', current_setting('test.zoe') || '/avatar.jpg', u);
    RAISE EXCEPTION 'ÉCHEC T1b A a déposé la photo de l''enfant d''un autre foyer';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T1b refusé : photo de l''enfant d''un autre foyer'; END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('child-photos', current_setting('test.lucas') || '/autre.jpg', u);
    RAISE EXCEPTION 'ÉCHEC T1c un second objet pour le même enfant';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T1c refusé : un seul objet par enfant (avatar.jpg)'; END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('child-photos', current_setting('test.lucas') || '/dossier/avatar.jpg', u);
    RAISE EXCEPTION 'ÉCHEC T1d sous-dossier accepté';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T1d refusé : sous-dossier'; END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('child-photos', 'pas-un-uuid/avatar.jpg', u);
    RAISE EXCEPTION 'ÉCHEC T1e chemin sans identifiant d''enfant accepté';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T1e refusé : chemin sans identifiant d''enfant'; END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('child-photos', current_setting('test.lucas') || '/avatar.jpg', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'ÉCHEC T1f dépôt au nom d''un autre accepté';
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN RAISE NOTICE 'OK T1f refusé : dépôt au nom d''un autre (owner_id)'; END;
END $$;
RESET ROLE;

-- ─── T2 · children.photo_path : contrainte et écriture par un responsable ───
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  UPDATE public.children SET photo_path = current_setting('test.lucas') || '/avatar.jpg' WHERE id = current_setting('test.lucas')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T2a A n''a pas pu poser photo_path'; END IF;
  RAISE NOTICE 'OK T2a A pose photo_path';
  BEGIN
    UPDATE public.children SET photo_path = current_setting('test.zoe') || '/avatar.jpg' WHERE id = current_setting('test.lucas')::uuid;
    RAISE EXCEPTION 'ÉCHEC T2b photo_path pointe la photo d''un autre enfant';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T2b refusé : photo_path d''un autre enfant (contrainte)'; END;
  BEGIN
    UPDATE public.children SET photo_path = 'n''importe/quoi.png' WHERE id = current_setting('test.lucas')::uuid;
    RAISE EXCEPTION 'ÉCHEC T2c chemin quelconque accepté';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'OK T2c refusé : chemin quelconque (contrainte)'; END;
END $$;
RESET ROLE;

-- C (autre foyer) : ne peut pas écrire sur Lucas
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  UPDATE public.children SET photo_path = NULL WHERE id = current_setting('test.lucas')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T2d C a modifié l''enfant d''un autre foyer'; END IF;
  RAISE NOTICE 'OK T2d C ne modifie pas l''enfant d''un autre foyer';
END $$;
RESET ROLE;

-- ─── T3 · lecture : A, B oui ; C, enseignant, anonyme non ───────────────────
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'child-photos';
  RESET ROLE;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T3a A voit % photo(s)', n; END IF;
  PERFORM set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'child-photos';
  RESET ROLE;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T3b B (co-responsable) voit % photo(s)', n; END IF;
  RAISE NOTICE 'OK T3a-b les deux responsables lisent la photo';
  PERFORM set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'child-photos';
  RESET ROLE;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T3c C (autre foyer) voit % photo(s)', n; END IF;
  PERFORM set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'child-photos';
  RESET ROLE;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T3d l''enseignant de la classe voit % photo(s) (aucun accès dans ce sprint)', n; END IF;
  RAISE NOTICE 'OK T3c-d autre foyer et enseignant : aucun accès';
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'child-photos';
  RESET ROLE;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T3e anonyme voit % photo(s)', n; END IF;
  RAISE NOTICE 'OK T3e anonyme : aucun accès';
END $$;

-- ─── T4 · B remplace (UPDATE) puis supprime ; C ne supprime rien ────────────
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE storage.objects SET updated_at = now() WHERE bucket_id = 'child-photos' AND name = current_setting('test.lucas') || '/avatar.jpg';
  GET DIAGNOSTICS n = ROW_COUNT;
  RESET ROLE;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T4a B (co-responsable) n''a pas pu remplacer la photo (%)', n; END IF;
  RAISE NOTICE 'OK T4a un co-responsable remplace la photo posée par l''autre';
  PERFORM set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE storage.objects SET updated_at = now() WHERE bucket_id = 'child-photos';
  GET DIAGNOSTICS n = ROW_COUNT;
  RESET ROLE;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T4b C a remplacé la photo d''un autre foyer'; END IF;
  RAISE NOTICE 'OK T4b autre foyer : remplacement refusé';
END $$;

-- ─── T4c · enseignant et anonyme : dépôt, remplacement et suppression refusés ──────────────
DO $$
DECLARE n int;
BEGIN
  -- Enseignant titulaire de la classe de Lucas
  PERFORM set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('child-photos', current_setting('test.lucas') || '/avatar.jpg', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    RESET ROLE;
    RAISE EXCEPTION 'ÉCHEC T4c-1 l''enseignant a déposé une photo';
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN RESET ROLE; RAISE NOTICE 'OK T4c-1 enseignant : dépôt refusé'; END;
  SET LOCAL ROLE authenticated;
  UPDATE storage.objects SET updated_at = now() WHERE bucket_id = 'child-photos';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RESET ROLE; RAISE EXCEPTION 'ÉCHEC T4c-2 l''enseignant a modifié % photo(s)', n; END IF;
  -- Le garde-fou de Storage (storage.protect_delete) interdit TOUT DELETE SQL direct : refus attendu (ou 0 ligne).
  -- La suppression par un autre rôle est prouvée par l'API Storage réelle (npm run test:photo-enfant-local).
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'child-photos';
    GET DIAGNOSTICS n = ROW_COUNT;
  EXCEPTION WHEN raise_exception OR insufficient_privilege THEN n := 0; END;
  RESET ROLE;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T4c-3 l''enseignant a supprimé % photo(s)', n; END IF;
  RAISE NOTICE 'OK T4c-2/3 enseignant : remplacement et suppression sans effet';
  -- Anonyme
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE anon;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('child-photos', current_setting('test.lucas') || '/avatar.jpg');
    RESET ROLE;
    RAISE EXCEPTION 'ÉCHEC T4c-4 l''anonyme a déposé une photo';
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN RESET ROLE; RAISE NOTICE 'OK T4c-4 anonyme : dépôt refusé'; END;
  SET LOCAL ROLE anon;
  BEGIN
    UPDATE storage.objects SET updated_at = now() WHERE bucket_id = 'child-photos';
    GET DIAGNOSTICS n = ROW_COUNT;
    DELETE FROM storage.objects WHERE bucket_id = 'child-photos';
    RESET ROLE;
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN RESET ROLE; n := 0; END;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T4c-5 l''anonyme a modifié des photos'; END IF;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'child-photos' AND name = current_setting('test.lucas') || '/avatar.jpg';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T4c-6 la photo de Lucas a disparu (%)', n; END IF;
  RAISE NOTICE 'OK T4c-5/6 anonyme : remplacement et suppression sans effet, la photo existe toujours';
END $$;

-- ─── T5 · photos_a_effacer / photos_orphelines : service seulement, bonnes lignes ──
DO $$
DECLARE n int;
BEGIN
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.photos_orphelines();
    RESET ROLE;
    RAISE EXCEPTION 'ÉCHEC T5a photos_orphelines appelable par un compte';
  EXCEPTION WHEN insufficient_privilege THEN RESET ROLE; RAISE NOTICE 'OK T5a photos_orphelines refusée à un compte connecté'; END;
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.photos_a_effacer(gen_random_uuid());
    RESET ROLE;
    RAISE EXCEPTION 'ÉCHEC T5b photos_a_effacer appelable par anon';
  EXCEPTION WHEN insufficient_privilege THEN RESET ROLE; RAISE NOTICE 'OK T5b photos_a_effacer refusée à anonyme'; END;

  -- La photo de Lucas est référencée par children.photo_path : jamais « orpheline », même vieille.
  UPDATE storage.objects SET created_at = now() - interval '3 days' WHERE bucket_id = 'child-photos';
  SELECT count(*) INTO n FROM public.photos_orphelines();
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5c photo référencée jugée orpheline'; END IF;
  -- Dépôt interrompu (objet sans photo_path) et vieux : orphelin ; récent : conservé.
  INSERT INTO storage.objects (bucket_id, name, created_at) VALUES ('child-photos', current_setting('test.zoe') || '/avatar.jpg', now() - interval '3 days');
  SELECT count(*) INTO n FROM public.photos_orphelines();
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T5d orphelins : % (attendu 1)', n; END IF;
  UPDATE storage.objects SET created_at = now() WHERE bucket_id = 'child-photos' AND name = current_setting('test.zoe') || '/avatar.jpg';
  SELECT count(*) INTO n FROM public.photos_orphelines();
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5e un dépôt récent est supprimé (laisser 1 jour)'; END IF;
  RAISE NOTICE 'OK T5c-e orphelins : seulement les objets non référencés ET de plus d''un jour';
END $$;

-- ─── T6 · effacement de l'enfant : seule SA photo est listée (jamais celle d'un autre foyer) ─
DO $$
DECLARE
  v_dem uuid; f text[]; n int;
BEGIN
  -- Demande d'effacement de Lucas échue, créée par le serveur (la table est fermée à l'app).
  INSERT INTO public.demandes_effacement (user_id, portee, child_id, execution_prevue_le)
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'enfant', current_setting('test.lucas')::uuid, now() - interval '1 minute')
    RETURNING id INTO v_dem;
  SELECT array_agg(x) INTO f FROM public.photos_a_effacer(v_dem) x;
  IF f IS DISTINCT FROM ARRAY[current_setting('test.lucas') || '/avatar.jpg'] THEN
    RAISE EXCEPTION 'ÉCHEC T6a photos_a_effacer : %', f;
  END IF;
  RAISE NOTICE 'OK T6a photos_a_effacer = la photo de Lucas seule (pas celle de Zoé)';
  -- Les lignes partent en cascade avec l'enfant ; l'objet est supprimé AVANT par l'Edge Function (API Storage).
  PERFORM public.executer_effacement(v_dem);
  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.lucas')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6b l''enfant existe encore'; END IF;
  SELECT count(*) INTO n FROM public.photos_orphelines(interval '0 seconds') x WHERE x = current_setting('test.lucas') || '/avatar.jpg';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T6c l''objet de la photo d''un enfant effacé n''est pas repris par le nettoyage (filet de sécurité)'; END IF;
  RAISE NOTICE 'OK T6b-c enfant effacé : ligne supprimée ; si l''objet restait, le nettoyage quotidien le reprend';
END $$;

ROLLBACK;
\echo 'M35 : tous les tests passent (transaction annulée)'
