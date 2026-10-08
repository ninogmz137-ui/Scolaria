-- Tests M24 · invitations vues par l'invité (+ acceptation par respond_invitation, M2c).
-- À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m24_mes_invitations.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- A (Claire) invite b@test.local (compte B, email confirmé) et x@test.local (pas de compte). C : autre compte.
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}', NULL);
UPDATE public.profiles SET first_name = 'Claire', family_name = 'Moreau' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS lea FROM public.create_child('Léa', 'Moreau', NULL, 5, 'GS', 'École test') \gset
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES (:'lea', auth.uid(), 'b@test.local') RETURNING id AS inv_b \gset
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES (:'lea', auth.uid(), 'c@test.local') RETURNING id AS inv_c \gset
RESET ROLE;
SELECT set_config('test.lea', :'lea', true), set_config('test.inv_b', :'inv_b', true), set_config('test.inv_c', :'inv_c', true) \gset

-- ─── B (invité, email confirmé) ────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"b@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE r record; n int;
BEGIN
  SELECT count(*) INTO n FROM public.mes_invitations();
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T1 B voit % invitation(s) (attendu 1)', n; END IF;
  SELECT * INTO r FROM public.mes_invitations();
  IF r.prenom_enfant <> 'Léa' OR r.prenom_invitant <> 'Claire' OR NOT r.email_confirme THEN
    RAISE EXCEPTION 'ÉCHEC T1b % / % / %', r.prenom_enfant, r.prenom_invitant, r.email_confirme;
  END IF;
  RAISE NOTICE 'OK T1 B voit « Claire vous invite à suivre le carnet de Léa » (prénoms seuls)';
  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.lea')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T2 B lit l''enfant avant d''accepter'; END IF;
  RAISE NOTICE 'OK T2 avant d''accepter, B ne lit pas le carnet';
  IF public.respond_invitation(current_setting('test.inv_b')::uuid, true) <> 'acceptee' THEN RAISE EXCEPTION 'ÉCHEC T3'; END IF;
  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.lea')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T3b B ne lit pas l''enfant après acceptation'; END IF;
  SELECT count(*) INTO n FROM public.mes_invitations();
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T3c invitation encore listée'; END IF;
  RAISE NOTICE 'OK T3 B accepte : il lit le carnet de Léa, l''invitation disparaît de sa liste';
END $$;
RESET ROLE;

-- ─── C (invité, email NON confirmé) ────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","email":"c@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.mes_invitations();
  IF r.email_confirme THEN RAISE EXCEPTION 'ÉCHEC T4 email non confirmé vu confirmé'; END IF;
  BEGIN
    PERFORM public.respond_invitation(current_setting('test.inv_c')::uuid, true);
    RAISE EXCEPTION 'ÉCHEC T4b acceptation sans email confirmé';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T4 email non confirmé : invitation visible, acceptation refusée (l''app demande de confirmer)';
  BEGIN
    PERFORM public.respond_invitation(current_setting('test.inv_b')::uuid, true);
    RAISE EXCEPTION 'ÉCHEC T5 C accepte l''invitation de B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T5 on ne peut pas accepter l''invitation adressée à un autre';
END $$;
RESET ROLE;

-- ─── Invitation expirée, anonyme ───────────────────────────────────────────
UPDATE public.invitations_responsable SET expires_at = now() - interval '1 minute' WHERE id = :'inv_c';
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","email":"c@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  -- Depuis M34 (4 oct) : une invitation expirée reste LISTÉE (30 jours), marquée « expiree », pour que l'app dise
  -- « Invitation expirée, demandez à [prénom] de vous réinviter » ; elle n'est jamais acceptable (m34, T2).
  SELECT count(*) INTO n FROM public.mes_invitations() WHERE expiree;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T6 invitation expirée non signalée « expiree » (%)', n; END IF;
  SELECT count(*) INTO n FROM public.mes_invitations() WHERE NOT expiree;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6 bis invitation expirée présentée comme valide'; END IF;
  RAISE NOTICE 'OK T6 invitation expirée : listée comme expirée, jamais comme valide';
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.mes_invitations();
  RAISE EXCEPTION 'ÉCHEC T7 anon exécute mes_invitations';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T7 anonyme : refusé';
END $$;
RESET ROLE;

\echo '── Tous les tests M24 sont passés ──'
ROLLBACK;
