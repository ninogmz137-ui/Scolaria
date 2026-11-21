-- Tests M28 · « Me retirer de ce carnet ». À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m28_quitter_carnet.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}', now());

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS emma FROM public.create_child('Emma', 'Moreau', NULL, 12, '5e', 'Collège test') \gset
SELECT id AS lea FROM public.create_child('Léa', 'Moreau', NULL, 5, 'GS', 'École test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset

-- B responsable d'Emma ET de Léa (même foyer) ; C responsable d'Emma seulement.
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', child_id, 'parent' FROM public.responsables WHERE child_id IN (:'emma', :'lea');
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', child_id, 'parent' FROM public.responsables WHERE child_id = :'emma' AND user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- B : 2 ajouts privés + 1 partagé sur Emma ; 1 privé sur Léa (ne doit pas bouger).
INSERT INTO public.carnet_items (child_id, categorie, titre, ajoute_par, visibilite) VALUES
  (:'emma', 'jalon', 'Privé 1 de B', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'prive'),
  (:'emma', 'jalon', 'Privé 2 de B', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'prive'),
  (:'emma', 'souvenir', 'Partagé de B', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'foyer'),
  (:'lea', 'jalon', 'Privé de B sur Léa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'prive');
-- B invite, depuis le carnet d'Emma : une personne extérieure ET sa propre adresse (tentative de se réinviter).
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES
  (:'emma', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'x@test.local'),
  (:'emma', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local');
-- A invite aussi quelqu'un (ne doit PAS être annulée par le départ de B).
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES
  (:'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'y@test.local');
SELECT id AS inv_soi FROM public.invitations_responsable WHERE invited_by = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND invited_email = 'b@test.local' \gset
SELECT set_config('test.emma', :'emma', true), set_config('test.lea', :'lea', true), set_config('test.inv_soi', :'inv_soi', true) \gset

-- ─── A ne peut pas retirer B (on ne retire que soi-même) ─────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  DELETE FROM public.responsables WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND child_id = current_setting('test.emma')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T1 A retire B'; END IF;
  RAISE NOTICE 'OK T1 un responsable ne peut pas retirer un autre responsable';
END $$;
RESET ROLE;

-- ─── B : aperçu puis départ du carnet d'Emma ─────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"b@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE r record; n int;
BEGIN
  SELECT * INTO r FROM public.apercu_depart_carnet(current_setting('test.emma')::uuid);
  IF r.nb_prives <> 2 OR r.nb_partages <> 1 OR r.nb_responsables <> 3 THEN
    RAISE EXCEPTION 'ÉCHEC T2 aperçu % / % / %', r.nb_prives, r.nb_partages, r.nb_responsables;
  END IF;
  RAISE NOTICE 'OK T2 aperçu : 2 ajouts privés supprimés, 1 partagé conservé, 3 responsables';

  PERFORM public.quitter_carnet(current_setting('test.emma')::uuid);
  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.emma')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T3 B voit encore Emma'; END IF;
  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.lea')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T3b B a perdu Léa'; END IF;
  RAISE NOTICE 'OK T3 B se retire d''Emma : plus d''accès à Emma, Léa intacte';
END $$;
RESET ROLE;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.carnet_items WHERE ajoute_par = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND child_id = current_setting('test.emma')::uuid AND visibilite = 'prive';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T4 ajouts privés de B conservés'; END IF;
  SELECT count(*) INTO n FROM public.carnet_items WHERE ajoute_par = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND child_id = current_setting('test.emma')::uuid AND visibilite = 'foyer';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T4b ajout partagé de B perdu'; END IF;
  SELECT count(*) INTO n FROM public.carnet_items WHERE child_id = current_setting('test.lea')::uuid AND visibilite = 'prive';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T4c ajout privé sur Léa touché'; END IF;
  RAISE NOTICE 'OK T4 ajouts privés de B sur Emma supprimés ; partagé conservé ; ajout privé sur Léa intact';
  SELECT count(*) INTO n FROM public.departs_foyer WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND child_id = current_setting('test.emma')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T5 départ non enregistré (M23)'; END IF;
  RAISE NOTICE 'OK T5 le départ est enregistré (M23 : lecture bornée des fils du foyer)';
  SELECT count(*) INTO n FROM public.invitations_responsable WHERE invited_by = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND statut = 'en_attente';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6 invitations de B encore en attente'; END IF;
  SELECT count(*) INTO n FROM public.invitations_responsable WHERE invited_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND statut = 'en_attente';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T6b invitation de A annulée à tort'; END IF;
  RAISE NOTICE 'OK T6 invitations envoyées par B annulées ; celle de A intacte';
END $$;

-- B ne peut pas se réinviter après son départ
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"b@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  BEGIN
    PERFORM public.respond_invitation(current_setting('test.inv_soi')::uuid, true);
    RAISE EXCEPTION 'ÉCHEC T7 B se réinvite et retrouve l''accès';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.emma')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T7b accès retrouvé'; END IF;
  RAISE NOTICE 'OK T7 B ne peut pas se réinviter après son départ (faille fermée)';
  BEGIN
    PERFORM public.quitter_carnet(current_setting('test.emma')::uuid);
    RAISE EXCEPTION 'ÉCHEC T8 quitter un carnet dont on n''est plus responsable';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T8 quitter deux fois : refusé (non_responsable)';
  END;
END $$;
RESET ROLE;

-- ─── C puis A : le dernier responsable ne peut PAS se retirer ────────────────
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","email":"c@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT public.quitter_carnet(:'emma'::uuid);
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  BEGIN
    PERFORM public.quitter_carnet(current_setting('test.emma')::uuid);
    RAISE EXCEPTION 'ÉCHEC T9 le dernier responsable se retire';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    DELETE FROM public.responsables WHERE user_id = auth.uid() AND child_id = current_setting('test.emma')::uuid;
    RAISE EXCEPTION 'ÉCHEC T9b suppression directe du dernier responsable';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.emma')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T9c Emma n''est plus visible'; END IF;
  RAISE NOTICE 'OK T9 le dernier responsable ne peut pas se retirer (fonction ET suppression directe) ; l''enfant reste accessible';
END $$;
RESET ROLE;

-- ─── Anonyme ─────────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.quitter_carnet(gen_random_uuid());
  RAISE EXCEPTION 'ÉCHEC T10 anonyme';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T10 anonyme : refusé';
END $$;
RESET ROLE;

ROLLBACK;
