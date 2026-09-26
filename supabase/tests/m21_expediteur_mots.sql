-- Tests M21 · expéditeur lisible des mots du carnet (mots_carnet_expediteurs).
-- À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m21_expediteur_mots.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- A et B responsables de Lucas, C autre foyer, T enseignante (Claire Dupont), U enseignant sans nom.
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 't@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'u@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}');
INSERT INTO public.profiles (id, email, role) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 't@test.local', 'enseignant'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'u@test.local', 'enseignant')
  ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET first_name = 'Claire', family_name = 'Dupont', phone = '0600000000'
  WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
UPDATE public.profiles SET first_name = '', family_name = '' WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS lucas FROM public.create_child('Lucas', 'Test', NULL, 10, 'CM2', 'École test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', child_id, 'parent' FROM public.responsables WHERE child_id = :'lucas';

INSERT INTO public.mots_liaison (teacher_id, classe, type, titre, contenu, statut, signature_mode)
  VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'CM2 B', 'signature', 'Sortie', 'Texte', 'envoyé', 'one') RETURNING id AS m1 \gset
INSERT INTO public.mots_liaison (teacher_id, classe, type, titre, contenu, statut, signature_mode)
  VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'CM2 B', 'information', 'Brouillon', 'Texte', 'brouillon', 'none') RETURNING id AS m2 \gset
INSERT INTO public.mots_liaison (teacher_id, classe, type, titre, contenu, statut, signature_mode)
  VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'CM2 B', 'information', 'Sans nom', 'Texte', 'envoyé', 'none') RETURNING id AS m3 \gset
INSERT INTO public.mot_carnets (mot_id, child_id) VALUES (:'m1', :'lucas'), (:'m2', :'lucas'), (:'m3', :'lucas');
SELECT set_config('test.lucas', :'lucas', true), set_config('test.m1', :'m1', true), set_config('test.m3', :'m3', true) \gset

-- T1-T3 · responsables A et B : le nom de l'enseignante, jamais le brouillon ; « Enseignant » sans nom.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int; e text;
BEGIN
  SELECT count(*) INTO n FROM public.mots_carnet_expediteurs(current_setting('test.lucas')::uuid);
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T1 % lignes (attendu 2, brouillon exclu)', n; END IF;
  SELECT expediteur INTO e FROM public.mots_carnet_expediteurs(current_setting('test.lucas')::uuid) WHERE mot_id = current_setting('test.m1')::uuid;
  IF e <> 'Claire Dupont' THEN RAISE EXCEPTION 'ÉCHEC T1b expéditeur = %', e; END IF;
  RAISE NOTICE 'OK T1 responsable A : « Claire Dupont », brouillon exclu';
  SELECT expediteur INTO e FROM public.mots_carnet_expediteurs(current_setting('test.lucas')::uuid) WHERE mot_id = current_setting('test.m3')::uuid;
  IF e <> 'Enseignant' THEN RAISE EXCEPTION 'ÉCHEC T2 expéditeur sans nom = %', e; END IF;
  RAISE NOTICE 'OK T2 enseignant sans nom : « Enseignant » (jamais un code)';
  -- Le profil de l'enseignante reste illisible directement (seul le nom passe par la fonction).
  SELECT count(*) INTO n FROM public.profiles WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T3 profil de l''enseignante lisible'; END IF;
  RAISE NOTICE 'OK T3 le profil de l''enseignante (e-mail, téléphone) reste illisible';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.mots_carnet_expediteurs(current_setting('test.lucas')::uuid);
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T4 % lignes pour B', n; END IF;
  RAISE NOTICE 'OK T4 second responsable B : mêmes expéditeurs';
END $$;
RESET ROLE;

-- T5 · C (autre foyer) : rien.
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.mots_carnet_expediteurs(current_setting('test.lucas')::uuid);
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5 un non-responsable voit % expéditeurs', n; END IF;
  RAISE NOTICE 'OK T5 non-responsable (autre foyer) : aucun résultat';
END $$;
RESET ROLE;

-- T6 · anonyme : exécution refusée.
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.mots_carnet_expediteurs(current_setting('test.lucas')::uuid);
  RAISE EXCEPTION 'ÉCHEC T6 anon a exécuté la fonction';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T6 anonyme : exécution refusée';
END $$;
RESET ROLE;

\echo '── Tous les tests M21 sont passés ──'
ROLLBACK;
