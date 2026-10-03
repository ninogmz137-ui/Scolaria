-- Tests M29 · fils individuels avec l'enseignant CONSERVÉS quand le responsable part ou que son compte est supprimé.
-- À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m29_fils_individuels_conserves.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}', now());

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS emma FROM public.create_child('Emma', 'Moreau', NULL, 12, '5e', 'Collège test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, u, child_id, 'parent' FROM public.responsables, (VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid), ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid)) v(u)
  WHERE child_id = :'emma' AND user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT foyer_id AS foyer FROM public.responsables WHERE child_id = :'emma' LIMIT 1 \gset

-- Fils : individuel avec B, individuel avec A, fil famille.
INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, parent_id, parent_name) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'emma', 'individuel', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Marc Moreau') RETURNING id AS fil_b \gset
INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, parent_id, parent_name) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'emma', 'individuel', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Claire Moreau') RETURNING id AS fil_a \gset
INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, foyer_id, parent_name) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'emma', 'foyer', :'foyer', 'Famille Moreau') RETURNING id AS fil_f \gset
INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text) VALUES
  (:'fil_b', 'parent', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Emma a une allergie'),
  (:'fil_b', 'teacher', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Bien noté'),
  (:'fil_a', 'parent', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Bonjour'),
  (:'fil_f', 'parent', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Absence lundi');
SELECT set_config('test.emma', :'emma', true), set_config('test.fil_b', :'fil_b', true),
       set_config('test.fil_a', :'fil_a', true), set_config('test.fil_f', :'fil_f', true) \gset

-- ─── B lit son fil individuel, puis se retire du carnet ──────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"b@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE id = current_setting('test.fil_b')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T0 B ne lit pas son fil avant de partir'; END IF;
  PERFORM public.quitter_carnet(current_setting('test.emma')::uuid);
  SELECT count(*) INTO n FROM public.teacher_conversations;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T1 B lit encore % fil(s) après son départ', n; END IF;
  SELECT count(*) INTO n FROM public.teacher_messages;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T1b B lit encore % message(s)', n; END IF;
  RAISE NOTICE 'OK T1 B se retire : plus aucun accès à ses fils (individuel ni famille)';
END $$;
RESET ROLE;

DO $$
DECLARE r record; n int;
BEGIN
  SELECT * INTO r FROM public.teacher_conversations WHERE id = current_setting('test.fil_b')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'ÉCHEC T2 le fil individuel de B a été supprimé'; END IF;
  IF r.parent_id IS NOT NULL OR r.parent_name <> 'Ancien responsable' THEN
    RAISE EXCEPTION 'ÉCHEC T2b fil non anonymisé : % / %', r.parent_id, r.parent_name;
  END IF;
  SELECT count(*) INTO n FROM public.teacher_messages WHERE conversation_id = current_setting('test.fil_b')::uuid;
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T2c messages perdus (%)', n; END IF;
  RAISE NOTICE 'OK T2 fil individuel de B CONSERVÉ : parent_id NULL, « Ancien responsable », ses 2 messages gardés';
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE id IN (current_setting('test.fil_a')::uuid, current_setting('test.fil_f')::uuid) AND parent_name IN ('Claire Moreau', 'Famille Moreau');
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T3 fils de A / famille touchés'; END IF;
  RAISE NOTICE 'OK T3 le fil individuel de A et le fil famille ne changent pas';
END $$;

-- ─── L'enseignant lit le fil conservé ; A ne le lit pas ; B réinvité ne le retrouve pas ───
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.teacher_conversations WHERE id = current_setting('test.fil_b')::uuid;
  IF NOT FOUND OR r.parent_name <> 'Ancien responsable' THEN RAISE EXCEPTION 'ÉCHEC T4 l''enseignant ne lit pas le fil conservé'; END IF;
  RAISE NOTICE 'OK T4 l''enseignant lit le fil conservé, nom affiché « Ancien responsable »';
  -- L'enseignant ne peut pas couper à la main un parent encore responsable (fil individuel de A).
  BEGIN
    UPDATE public.teacher_conversations SET parent_id = NULL, parent_parti = true WHERE id = current_setting('test.fil_a')::uuid;
    RAISE EXCEPTION 'ÉCHEC T4b l''enseignant orpheline le fil d''un parent encore responsable';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T4b l''anonymisation à la main est refusée (parent encore responsable)';
  END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE id = current_setting('test.fil_b')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5 A lit le fil individuel d''un autre responsable'; END IF;
  RAISE NOTICE 'OK T5 un autre responsable ne lit pas le fil individuel conservé';
END $$;
RESET ROLE;
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien) VALUES (:'foyer', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', :'emma', 'parent');
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE id = current_setting('test.fil_b')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6 B réinvité retrouve son ancien fil individuel'; END IF;
  RAISE NOTICE 'OK T6 B réinvité plus tard ne retrouve pas son ancien fil individuel';
  -- Falsification : un compte ne peut pas toucher parent_id lui-même
  BEGIN
    UPDATE public.teacher_conversations SET parent_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' WHERE id = current_setting('test.fil_a')::uuid;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T7 un parent modifie parent_id'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T7 un compte ne peut pas réattribuer un fil (mise à jour réservée à l''enseignant, verrou des participants)';
END $$;
RESET ROLE;
DELETE FROM public.responsables WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

-- ─── Suppression du compte de A : son fil individuel est conservé, anonymisé ───
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT demande_id AS dem FROM public.demander_effacement_compte() \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset
UPDATE public.demandes_effacement SET execution_prevue_le = now() - interval '1 minute' WHERE id = :'dem';
SET LOCAL ROLE service_role;
SELECT public.executer_effacement(:'dem'::uuid);
RESET ROLE;
DELETE FROM auth.users WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

DO $$
DECLARE r record; n int;
BEGIN
  SELECT * INTO r FROM public.teacher_conversations WHERE id = current_setting('test.fil_a')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'ÉCHEC T8 fil individuel de A supprimé avec son compte'; END IF;
  IF r.parent_id IS NOT NULL OR r.parent_name <> 'Ancien responsable' THEN RAISE EXCEPTION 'ÉCHEC T8b non anonymisé : % / %', r.parent_id, r.parent_name; END IF;
  SELECT count(*) INTO n FROM public.teacher_messages WHERE conversation_id = current_setting('test.fil_a')::uuid AND sender_id IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T8c message de A non conservé sans auteur'; END IF;
  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.emma')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T8d Emma perdue (C est resté responsable)'; END IF;
  RAISE NOTICE 'OK T8 compte de A supprimé : son fil individuel conservé (« Ancien responsable », message sans auteur) ; Emma reste à C';
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE id = current_setting('test.fil_f')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T9 fil famille perdu'; END IF;
  RAISE NOTICE 'OK T9 le fil famille reste';
END $$;

ROLLBACK;
