-- Tests M23 · parent qui quitte le foyer : lecture seule du fil famille jusqu'à son départ.
-- À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m23_depart_foyer.sql
--
-- Lucas : foyer F1 = Claire (A) et Marc (B). Marc part dans un nouveau foyer F3. T : titulaire.
-- Messages du fil famille F1 : m_avant (avant le départ de Marc), m_apres (après).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@test.local', 'authenticated', 'authenticated', '{}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 't@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}');
UPDATE public.profiles SET first_name = 'Anne', family_name = 'Dupont', role = 'enseignant' WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS lucas FROM public.create_child('Lucas', 'Moreau', NULL, 10, 'CM2', 'École test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset
SELECT foyer_id AS f1 FROM public.responsables WHERE child_id = :'lucas' \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien) VALUES (:'f1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', :'lucas', 'parent');
-- D : responsable de Lucas dans F1, qui partira SANS nouveau foyer (plus responsable du tout).
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien) VALUES (:'f1', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'lucas', 'autre');
SELECT id AS ay FROM public.academic_years WHERE student_id = :'lucas' \gset
INSERT INTO public.ecoles (nom) VALUES ('École test') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', (SELECT annee_scolaire FROM public.academic_years WHERE id = :'ay'), 'CM2', 'CM2 B', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
  RETURNING id AS classe \gset
UPDATE public.academic_years SET classe_id = :'classe', statut = 'active' WHERE id = :'ay';

-- Fil famille F1 et deux messages : avant et après le départ (dates posées par le test).
INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, foyer_id)
  VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', :'lucas', 'foyer', :'f1') RETURNING id AS fil \gset
INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text, created_at)
  VALUES (:'fil', 'teacher', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Avant le départ', now() - interval '2 days') RETURNING id AS m_avant \gset
INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text, created_at)
  VALUES (:'fil', 'parent', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Après le départ', now() + interval '1 hour') RETURNING id AS m_apres \gset

-- Départs : Marc passe dans un NOUVEAU foyer F3 (reste responsable) ; D quitte tout.
INSERT INTO public.foyers (nom, created_by) VALUES ('Foyer de Marc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') RETURNING id AS f3 \gset
UPDATE public.responsables SET foyer_id = :'f3' WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND child_id = :'lucas';
DELETE FROM public.responsables WHERE user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' AND child_id = :'lucas';
SELECT set_config('test.lucas', :'lucas', true), set_config('test.fil', :'fil', true), set_config('test.f3', :'f3', true),
       set_config('test.m_avant', :'m_avant', true), set_config('test.m_apres', :'m_apres', true) \gset

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.departs_foyer WHERE child_id = current_setting('test.lucas')::uuid;
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T0 % départs enregistrés (attendu 2 : Marc, D)', n; END IF;
  RAISE NOTICE 'OK T0 départs enregistrés automatiquement (changement de foyer, retrait)';
END $$;

-- ─── Marc (parti dans F3, toujours responsable) ────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE id = current_setting('test.fil')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T1 Marc ne voit plus l''ancien fil famille'; END IF;
  SELECT count(*) INTO n FROM public.teacher_messages WHERE id = current_setting('test.m_avant')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T1b Marc ne lit plus le message d''avant son départ'; END IF;
  RAISE NOTICE 'OK T1 Marc lit encore l''ancien fil famille, jusqu''à son départ';
  SELECT count(*) INTO n FROM public.teacher_messages WHERE id = current_setting('test.m_apres')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T2 Marc lit un message postérieur à son départ'; END IF;
  RAISE NOTICE 'OK T2 rien après le départ';
  BEGIN
    INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
      VALUES (current_setting('test.fil')::uuid, 'parent', auth.uid(), 'Encore là');
    RAISE EXCEPTION 'ÉCHEC T3 Marc écrit dans l''ancien fil';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.teacher_messages SET read = true WHERE id = current_setting('test.m_avant')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T3b Marc modifie l''ancien fil (lu)'; END IF;
  RAISE NOTICE 'OK T3 lecture SEULE : ni écriture ni « lu » dans l''ancien fil';
  IF public.fil_enseignant(current_setting('test.fil')::uuid) IS DISTINCT FROM 'Anne Dupont' THEN RAISE EXCEPTION 'ÉCHEC T4 nom de l''enseignante'; END IF;
  RAISE NOTICE 'OK T4 le nom de l''enseignante reste lisible pour l''historique';
  -- Ses nouveaux messages : fil de son NOUVEAU foyer.
  INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, foyer_id)
    VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', current_setting('test.lucas')::uuid, 'foyer', current_setting('test.f3')::uuid);
  INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
    SELECT id, 'parent', auth.uid(), 'Depuis mon nouveau foyer' FROM public.teacher_conversations WHERE foyer_id = current_setting('test.f3')::uuid;
  RAISE NOTICE 'OK T5 Marc écrit dans le fil de son nouveau foyer';
END $$;
RESET ROLE;

-- ─── Claire (restée dans F1) : pas d'accès au fil du nouveau foyer de Marc ──
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE foyer_id = current_setting('test.f3')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6 Claire voit le fil du nouveau foyer de Marc'; END IF;
  SELECT count(*) INTO n FROM public.teacher_messages WHERE conversation_id = current_setting('test.fil')::uuid;
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T6b Claire lit % message(s) de son fil (attendu 2)', n; END IF;
  RAISE NOTICE 'OK T6 Claire garde tout son fil, ne voit pas celui du nouveau foyer de Marc';
END $$;
RESET ROLE;

-- ─── D (plus responsable du tout) : rien ─────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_messages;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T7 un ex-responsable (plus responsable) lit % message(s)', n; END IF;
  SELECT count(*) INTO n FROM public.teacher_conversations;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T7b un ex-responsable voit % fil(s)', n; END IF;
  RAISE NOTICE 'OK T7 plus responsable de l''enfant : plus aucun accès (cas à confirmer, todo)';
  BEGIN
    SELECT count(*) INTO n FROM public.departs_foyer;
    RAISE EXCEPTION 'ÉCHEC T8 table departs_foyer lisible par l''API';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T8 departs_foyer illisible par l''API';
  END;
END $$;
RESET ROLE;

-- ─── Suppression en cascade : un enfant supprimé ne bloque pas sur les départs ───
DO $$
BEGIN
  DELETE FROM public.children WHERE id = current_setting('test.lucas')::uuid;
  RAISE NOTICE 'OK T9 suppression de l''enfant (cascade) non bloquée par l''enregistrement des départs';
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.depart_du_fil(gen_random_uuid());
  RAISE EXCEPTION 'ÉCHEC T10 anon exécute depart_du_fil';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T10 anonyme : fonction refusée';
END $$;
RESET ROLE;

\echo '── Tous les tests M23 sont passés ──'
ROLLBACK;
