-- Tests M21 · expéditeur lisible d'un mot (mot_expediteur : le nom affichable SEUL).
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

-- T0 · la fonction ne renvoie QU'UN texte (le nom affichable) : ni e-mail, ni identifiant.
DO $$
DECLARE r record;
BEGIN
  SELECT p.prorettype::regtype::text AS type, p.proretset AS ensemble INTO r
  FROM pg_proc p WHERE p.proname = 'mot_expediteur' AND p.pronamespace = 'public'::regnamespace;
  IF r.type <> 'text' OR r.ensemble THEN RAISE EXCEPTION 'ÉCHEC T0 type renvoyé % (ensemble %)', r.type, r.ensemble; END IF;
  IF to_regprocedure('public.mots_carnet_expediteurs(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'ÉCHEC T0b l''ancienne fonction (avec mot_id) existe encore';
  END IF;
  RAISE NOTICE 'OK T0 un seul texte renvoyé (pas de ligne, pas d''identifiant) ; ancienne version supprimée';
END $$;

-- T1-T3 · responsable A : le nom de l'enseignante ; rien pour un brouillon ; « Enseignant » sans nom.
SELECT set_config('test.m2', :'m2', true) \gset
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE e text; n int;
BEGIN
  e := public.mot_expediteur(current_setting('test.m1')::uuid);
  IF e IS DISTINCT FROM 'Claire Dupont' THEN RAISE EXCEPTION 'ÉCHEC T1 expéditeur = %', e; END IF;
  RAISE NOTICE 'OK T1 responsable A : « Claire Dupont »';
  e := public.mot_expediteur(current_setting('test.m2')::uuid);
  IF e IS NOT NULL THEN RAISE EXCEPTION 'ÉCHEC T1b brouillon renvoyé : %', e; END IF;
  RAISE NOTICE 'OK T1b brouillon : rien';
  e := public.mot_expediteur(current_setting('test.m3')::uuid);
  IF e IS DISTINCT FROM 'Enseignant' THEN RAISE EXCEPTION 'ÉCHEC T2 expéditeur sans nom = %', e; END IF;
  RAISE NOTICE 'OK T2 enseignant sans nom : « Enseignant » (jamais un code)';
  SELECT count(*) INTO n FROM public.profiles WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T3 profil de l''enseignante lisible'; END IF;
  RAISE NOTICE 'OK T3 le profil de l''enseignante (e-mail, téléphone) reste illisible';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.mot_expediteur(current_setting('test.m1')::uuid) IS DISTINCT FROM 'Claire Dupont' THEN RAISE EXCEPTION 'ÉCHEC T4'; END IF;
  RAISE NOTICE 'OK T4 second responsable B : même expéditeur';
END $$;
RESET ROLE;

-- T5 · C (autre foyer) : rien.
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.mot_expediteur(current_setting('test.m1')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'ÉCHEC T5 un non-responsable voit l''expéditeur'; END IF;
  RAISE NOTICE 'OK T5 non-responsable (autre foyer) : rien';
END $$;
RESET ROLE;

-- T6 · anonyme : exécution refusée.
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.mot_expediteur(current_setting('test.m1')::uuid);
  RAISE EXCEPTION 'ÉCHEC T6 anon a exécuté la fonction';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T6 anonyme : exécution refusée';
END $$;
RESET ROLE;

\echo '── Tous les tests M21 sont passés ──'
ROLLBACK;
