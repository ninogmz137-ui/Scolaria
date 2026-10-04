-- Tests M34 · invitation expirée : réinviter, annuler, renvoyer, message de l'invité. Base LOCALE, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m34_invitations_expirees.sql
-- A : invitant (responsable d'Emma, prénom Claire) ; B : invité ; C : parent d'un AUTRE foyer ; D : autre adresse.

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}', now());
UPDATE public.profiles SET first_name = 'Claire' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS emma FROM public.create_child('Emma', 'Moreau', NULL, 9, 'CM1', 'École test') \gset
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES (:'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'b@test.local') RETURNING id AS inv1 \gset
RESET ROLE;
SELECT set_config('test.emma', :'emma', true), set_config('test.inv1', :'inv1', true) \gset

-- T1 : tant que l'invitation n'est PAS expirée, un doublon pour la même adresse reste refusé.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES (current_setting('test.emma')::uuid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'b@test.local');
    RAISE EXCEPTION 'ÉCHEC T1 doublon accepté alors que la première invitation est valide';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  RAISE NOTICE 'OK T1 doublon refusé tant que l''invitation est valide';
END $$;
RESET ROLE;

-- 8 jours passent : l'invitation expire.
UPDATE public.invitations_responsable SET expires_at = now() - interval '1 day', created_at = now() - interval '8 days' WHERE id = :'inv1';

-- T2 : l'invité voit « expirée », avec le prénom de l'invitant ; il ne peut pas accepter.
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"b@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.mes_invitations();
  IF NOT FOUND THEN RAISE EXCEPTION 'ÉCHEC T2 l''invité ne voit pas son invitation expirée'; END IF;
  IF NOT r.expiree OR r.prenom_invitant <> 'Claire' OR r.prenom_enfant <> 'Emma' THEN
    RAISE EXCEPTION 'ÉCHEC T2 expiree=%, invitant=%, enfant=%', r.expiree, r.prenom_invitant, r.prenom_enfant;
  END IF;
  BEGIN
    PERFORM public.respond_invitation(r.invitation_id, true);
    RAISE EXCEPTION 'ÉCHEC T2 bis invitation expirée acceptée';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  IF public.is_responsable(current_setting('test.emma')::uuid) THEN RAISE EXCEPTION 'ÉCHEC T2 ter accès obtenu par une invitation expirée'; END IF;
  RAISE NOTICE 'OK T2 l''invité voit « expirée » (prénom de l''invitant : Claire) et ne peut pas accepter';
END $$;
RESET ROLE;

-- T3 : l'invitant réinvite la MÊME adresse après expiration : accepté (c'était le piège), l'ancienne passe en « annulee ».
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES (:'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'b@test.local') RETURNING id AS inv2 \gset
RESET ROLE;
SELECT set_config('test.inv2', :'inv2', true) \gset
DO $$
BEGIN
  IF (SELECT statut FROM public.invitations_responsable WHERE id = current_setting('test.inv1')::uuid) <> 'annulee' THEN RAISE EXCEPTION 'ÉCHEC T3 l''ancienne invitation expirée n''est pas annulée'; END IF;
  IF (SELECT statut FROM public.invitations_responsable WHERE id = current_setting('test.inv2')::uuid) <> 'en_attente' THEN RAISE EXCEPTION 'ÉCHEC T3 bis la nouvelle n''est pas en attente'; END IF;
  IF (SELECT expires_at FROM public.invitations_responsable WHERE id = current_setting('test.inv2')::uuid) < now() + interval '6 days' THEN RAISE EXCEPTION 'ÉCHEC T3 ter la nouvelle n''a pas 7 jours'; END IF;
  RAISE NOTICE 'OK T3 réinviter la même adresse après expiration fonctionne (ancienne annulée, nouvelle valable 7 jours)';
END $$;

-- T4 : l'invité ne voit plus que la nouvelle (non expirée), l'accepte, devient responsable.
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"b@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE r record; n int; res text;
BEGIN
  SELECT count(*) INTO n FROM public.mes_invitations();
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T4 % invitation(s) visibles au lieu de 1', n; END IF;
  SELECT * INTO r FROM public.mes_invitations();
  IF r.expiree THEN RAISE EXCEPTION 'ÉCHEC T4 bis la visible est encore expirée'; END IF;
  res := public.respond_invitation(r.invitation_id, true);
  IF res <> 'acceptee' OR NOT public.is_responsable(current_setting('test.emma')::uuid) THEN RAISE EXCEPTION 'ÉCHEC T4 ter acceptation : %', res; END IF;
  RAISE NOTICE 'OK T4 l''invité accepte la nouvelle invitation et devient responsable';
END $$;
RESET ROLE;

-- T5 : annuler (responsable) ; un étranger (C) ne peut ni annuler ni renvoyer ; l'invité non plus ; anonyme refusé.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES (:'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'd@test.local') RETURNING id AS inv3 \gset
RESET ROLE;
SELECT set_config('test.inv3', :'inv3', true) \gset
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","email":"c@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN PERFORM public.annuler_invitation(current_setting('test.inv3')::uuid); RAISE EXCEPTION 'ÉCHEC T5 un étranger annule';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.renvoyer_invitation(current_setting('test.inv3')::uuid); RAISE EXCEPTION 'ÉCHEC T5 bis un étranger renvoie';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.annuler_invitation(gen_random_uuid()); RAISE EXCEPTION 'ÉCHEC T5 ter invitation inconnue acceptée';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;   -- même erreur que pour un étranger
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN PERFORM public.annuler_invitation(current_setting('test.inv3')::uuid); RAISE EXCEPTION 'ÉCHEC T5 quater anonyme annule';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.renvoyer_invitation(current_setting('test.inv3')::uuid); RAISE EXCEPTION 'ÉCHEC T5 quinquies anonyme renvoie';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.annuler_invitation(current_setting('test.inv3')::uuid);
  IF (SELECT statut FROM public.invitations_responsable WHERE id = current_setting('test.inv3')::uuid) <> 'annulee' THEN RAISE EXCEPTION 'ÉCHEC T5 sexies annulation sans effet'; END IF;
  BEGIN PERFORM public.annuler_invitation(current_setting('test.inv3')::uuid); RAISE EXCEPTION 'ÉCHEC T5 septies double annulation acceptée';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  RAISE NOTICE 'OK T5 annuler : responsable seulement, une seule fois ; étranger, inconnue et anonyme refusés';
END $$;

-- T6 : renvoyer une invitation EXPIRÉE : nouvel identifiant, ancienne annulée, nouvelle valable 7 jours, à mon nom.
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES (:'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'e@test.local') RETURNING id AS inv4 \gset
RESET ROLE;
UPDATE public.invitations_responsable SET expires_at = now() - interval '2 days' WHERE id = :'inv4';
SELECT set_config('test.inv4', :'inv4', true) \gset
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE nouvelle uuid;
BEGIN
  nouvelle := public.renvoyer_invitation(current_setting('test.inv4')::uuid);
  IF nouvelle IS NULL OR nouvelle = current_setting('test.inv4')::uuid THEN RAISE EXCEPTION 'ÉCHEC T6 pas de nouvel identifiant'; END IF;
  IF (SELECT statut FROM public.invitations_responsable WHERE id = current_setting('test.inv4')::uuid) <> 'annulee' THEN RAISE EXCEPTION 'ÉCHEC T6 bis ancienne non annulée'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.invitations_responsable WHERE id = nouvelle AND statut = 'en_attente' AND invited_email = 'e@test.local'
                 AND invited_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND expires_at > now() + interval '6 days') THEN
    RAISE EXCEPTION 'ÉCHEC T6 ter nouvelle invitation incorrecte';
  END IF;
  RAISE NOTICE 'OK T6 renvoyer : nouvelle invitation de 7 jours, ancienne annulée';
END $$;
RESET ROLE;

-- T7 : au-delà de 30 jours d'expiration, l'invité ne la voit plus.
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email, expires_at) VALUES (:'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'c@test.local', now() + interval '1 day');
UPDATE public.invitations_responsable SET expires_at = now() - interval '40 days' WHERE invited_email = 'c@test.local';
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","email":"c@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.mes_invitations()) <> 0 THEN RAISE EXCEPTION 'ÉCHEC T7 une invitation expirée depuis 40 jours est encore montrée'; END IF;
  RAISE NOTICE 'OK T7 invitation expirée depuis plus de 30 jours : plus montrée';
END $$;
RESET ROLE;

ROLLBACK;
\echo 'M34 : 7 groupes de tests OK (transaction annulée)'
