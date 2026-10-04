-- Tests M30 · durcissement issu de l'audit de sécurité du 2 oct 2026. Base LOCALE, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m30_durcissement_audit.sql
-- A : parent d'Emma (classe de la titulaire TE) ; B : parent d'un autre foyer ; TE : titulaire ; TX : autre enseignant.

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'te@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'tx@test.local', 'authenticated', 'authenticated', '{}', now());
-- Depuis M33 (4 oct) un mot n'est créable que par profiles.role = 'enseignant' : posé par le serveur pour les 2 enseignants.
UPDATE public.profiles SET role = 'enseignant' WHERE id IN ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS emma FROM public.create_child('Emma', 'Moreau', NULL, 12, '5e', 'Collège test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset

SELECT id AS ay FROM public.academic_years WHERE student_id = :'emma' \gset
SELECT foyer_id AS foyer FROM public.responsables WHERE child_id = :'emma' \gset
INSERT INTO public.ecoles (nom) VALUES ('École test') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', (SELECT annee_scolaire FROM public.academic_years WHERE id = :'ay'), '5e', '5e A', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') RETURNING id AS classe_te \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', (SELECT annee_scolaire FROM public.academic_years WHERE id = :'ay'), '5e', '5e B', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') RETURNING id AS classe_tx \gset
UPDATE public.academic_years SET classe_id = :'classe_te' WHERE id = :'ay';
INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, signature_mode, classe_id)
  VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'information', 'Mot de TE', 'x', 'envoyé', 'none', :'classe_te') RETURNING id AS mot \gset
SELECT set_config('test.emma', :'emma', true), set_config('test.ay', :'ay', true), set_config('test.foyer', :'foyer', true),
       set_config('test.classe_te', :'classe_te', true), set_config('test.classe_tx', :'classe_tx', true), set_config('test.mot', :'mot', true) \gset

-- ─── 1. Oracles ──────────────────────────────────────────────────────────────
INSERT INTO public.demandes_effacement (portee, user_id) VALUES ('compte', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.compte_en_effacement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN RAISE EXCEPTION 'ÉCHEC T1 B apprend que A est en cours d''effacement'; END IF;
  IF public.est_titulaire_enfant(current_setting('test.emma')::uuid, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') THEN RAISE EXCEPTION 'ÉCHEC T2 B apprend qui est titulaire d''Emma'; END IF;
  RAISE NOTICE 'OK T1-T2 un tiers n''apprend ni l''état d''effacement d''un compte ni le titulaire d''un enfant';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT public.compte_en_effacement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN RAISE EXCEPTION 'ÉCHEC T3 A ne voit pas son propre état'; END IF;
  IF NOT public.est_titulaire_enfant(current_setting('test.emma')::uuid, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') THEN RAISE EXCEPTION 'ÉCHEC T3b le parent d''Emma ne voit pas la titulaire'; END IF;
  RAISE NOTICE 'OK T3 le concerné voit son état ; le parent d''Emma voit sa titulaire';
END $$;
RESET ROLE;
DO $$
BEGIN
  IF NOT public.compte_en_effacement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN RAISE EXCEPTION 'ÉCHEC T4 le serveur ne voit pas l''état'; END IF;
  RAISE NOTICE 'OK T4 le serveur (sans compte) voit l''état — l''effacement et le verrou des fils continuent de fonctionner';
END $$;
DELETE FROM public.demandes_effacement;

-- ─── 2-3. appreciations et mots_liaison ──────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  INSERT INTO public.appreciations (teacher_id, student_id, student_name, level, text) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', current_setting('test.emma')::uuid, 'Emma', 'bien', 'Très bien');
  RAISE NOTICE 'OK T5 la titulaire écrit une appréciation sur son élève';
  INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, signature_mode, classe_id) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'information', 'Autre mot', 'x', 'envoyé', 'none', current_setting('test.classe_te')::uuid);
  RAISE NOTICE 'OK T6 la titulaire envoie un mot à SA classe (distribué aux élèves)';
  BEGIN
    INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, classe_id) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'information', 'Intrus', 'x', 'brouillon', current_setting('test.classe_tx')::uuid);
    RAISE EXCEPTION 'ÉCHEC T7 mot créé pour la classe d''un autre enseignant';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T7 un mot pour la classe d''un autre enseignant est refusé';
  END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.appreciations (teacher_id, student_id, student_name, level, text) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', current_setting('test.emma')::uuid, 'Emma', 'bien', 'faux');
    RAISE EXCEPTION 'ÉCHEC T8 un parent écrit une appréciation sur l''enfant d''un autre';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T8 un parent ne peut pas écrire d''appréciation sur l''enfant d''un autre foyer';
  END;
  BEGIN
    INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, classe_id) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'information', 'Intrus', 'x', 'brouillon', current_setting('test.classe_te')::uuid);
    RAISE EXCEPTION 'ÉCHEC T9 un parent crée un mot pour une classe';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T9 un compte non titulaire ne peut rattacher un mot à une classe';
  END;
END $$;
RESET ROLE;

-- ─── 4. messages ─────────────────────────────────────────────────────────────
-- Depuis M32 l'accès client à `messages` est coupé (table inutilisée) : le droit est rétabli ICI, dans cette
-- transaction annulée, pour continuer à vérifier la politique et le verrou de M30 indépendamment de M32.
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  INSERT INTO public.messages (sender_id, receiver_id, body, child_id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bonjour', current_setting('test.emma')::uuid);
  RAISE NOTICE 'OK T10 un parent écrit un message sur SON enfant';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  BEGIN
    INSERT INTO public.messages (sender_id, receiver_id, body, child_id) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'faux', current_setting('test.emma')::uuid);
    RAISE EXCEPTION 'ÉCHEC T11 message rattaché à l''enfant d''un autre';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T11 un message ne peut pas être rattaché à l''enfant d''un autre foyer';
  END;
  UPDATE public.messages SET is_read = true WHERE receiver_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T12 le destinataire ne peut pas marquer « lu »'; END IF;
  BEGIN
    UPDATE public.messages SET body = 'réécrit' WHERE receiver_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    RAISE EXCEPTION 'ÉCHEC T12b le destinataire réécrit le message';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T12 le destinataire marque « lu » mais ne peut pas réécrire le message';
  END;
END $$;
RESET ROLE;

-- ─── 5. read_receipts ────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  INSERT INTO public.read_receipts (mot_id, parent_id) VALUES (current_setting('test.mot')::uuid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  RAISE NOTICE 'OK T13 un parent de la classe marque le mot « lu »';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.read_receipts (mot_id, parent_id) VALUES (current_setting('test.mot')::uuid, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'ÉCHEC T14 un étranger marque lu un mot qui n''est pas dans ses carnets';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T14 un étranger ne peut pas gonfler le « lu par » d''un mot';
  END;
END $$;
RESET ROLE;

-- ─── 6. Champs « auteur » et identifiants ────────────────────────────────────
INSERT INTO public.agenda_events (child_id, parent_id, title, event_type, start_time) VALUES (:'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'RDV', 'reunion', now());
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int; d numeric;
BEGIN
  BEGIN UPDATE public.agenda_events SET parent_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' WHERE title = 'RDV'; RAISE EXCEPTION 'ÉCHEC T15 auteur d''événement modifié';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.children SET parent_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' WHERE id = current_setting('test.emma')::uuid; RAISE EXCEPTION 'ÉCHEC T16 créateur de l''enfant modifié';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.children SET scolaria_id = 'FAUX' WHERE id = current_setting('test.emma')::uuid; RAISE EXCEPTION 'ÉCHEC T16b identifiant public modifié';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.foyers SET created_by = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' WHERE id = current_setting('test.foyer')::uuid; RAISE EXCEPTION 'ÉCHEC T17 créateur du foyer modifié';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.profiles SET plan = 'premium' WHERE id = auth.uid(); RAISE EXCEPTION 'ÉCHEC T18 forfait modifié';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.profiles SET role = 'enseignant' WHERE id = auth.uid(); RAISE EXCEPTION 'ÉCHEC T18b rôle modifié';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.children SET last_name = 'Moreau-Durand' WHERE id = current_setting('test.emma')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T19 le parent ne peut plus modifier le nom de son enfant'; END IF;
  RAISE NOTICE 'OK T15-T19 auteur d''événement, créateur d''enfant et de foyer, identifiant public, forfait et rôle verrouillés ; les champs ordinaires restent modifiables';
  INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email, expires_at) VALUES (current_setting('test.emma')::uuid, auth.uid(), 'x@test.local', now() + interval '3650 days');
  SELECT extract(epoch FROM (expires_at - now())) / 86400 INTO d FROM public.invitations_responsable WHERE invited_email = 'x@test.local';
  IF d > 7.01 OR d < 6.99 THEN RAISE EXCEPTION 'ÉCHEC T20 expiration de l''invitation : % jours', d; END IF;
  RAISE NOTICE 'OK T20 l''expiration d''une invitation est fixée par le serveur (7 jours), quelle que soit la valeur envoyée';
END $$;
RESET ROLE;

-- Le serveur garde la main (effacement de compte : rattachement du créateur à un autre responsable)
SELECT set_config('request.jwt.claims', '', true) \gset
DO $$
BEGIN
  UPDATE public.children SET parent_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' WHERE id = current_setting('test.emma')::uuid;
  RAISE NOTICE 'OK T21 le serveur (sans compte) peut rattacher le créateur d''un enfant (effacement de compte)';
END $$;

ROLLBACK;
