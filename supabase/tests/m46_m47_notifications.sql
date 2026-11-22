-- Tests M46 et M47 (notifications : téléphones, réglages, file et destinataires) — lot 7a.
-- Base LOCALE, données fictives, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m46_m47_notifications.sql
-- Acteurs : T titulaire de la classe d'Eva ; A et M responsables d'Eva (MÊME foyer) ; J responsable d'Eva dans un AUTRE
-- foyer (parent séparé) ; B parent d'un autre enfant (Félix).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 't@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'm@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'j@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{"role":"parent"}', now());
UPDATE public.profiles SET role = 'enseignant', first_name = 'Claire', family_name = 'Martin' WHERE id = '11111111-1111-4111-8111-111111111111';
INSERT INTO public.ecoles (nom) VALUES ('École lot 7a') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CE1', 'CE1 de T', '11111111-1111-4111-8111-111111111111') RETURNING id AS ct \gset

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Eva', 'Test', NULL, 7, 'CE1', 'École lot 7a')).id AS eva \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Félix', 'Autre', NULL, 7, 'CE1', 'École lot 7a')).id AS felix \gset
RESET ROLE;
UPDATE public.academic_years SET classe_id = :'ct' WHERE student_id IN (:'eva', :'felix');
SELECT foyer_id AS foyer_a FROM public.responsables WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND child_id = :'eva' \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_a', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', :'eva');
INSERT INTO public.foyers (nom, created_by) VALUES ('Foyer de J', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') RETURNING id AS foyer_j \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_j', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'eva');
SELECT set_config('test.eva', :'eva', true) \gset

-- ─── M46 : téléphones et réglages ─────────────────────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.appareils_push (user_id, jeton, plateforme) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ExponentPushToken[telephone-partage]', 'android');
INSERT INTO public.appareils_push (user_id, jeton, plateforme) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ExponentPushToken[second-telephone]', 'ios');
INSERT INTO public.preferences_notifications (user_id, silence) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.appareils_push) <> 2 THEN RAISE EXCEPTION 'N1 : A ne voit pas ses deux téléphones'; END IF;
  BEGIN
    INSERT INTO public.appareils_push (user_id, jeton, plateforme) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ExponentPushToken[usurpe]', 'android');
    RAISE EXCEPTION 'N1 : A a inscrit un téléphone au nom de B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'N1 OK : un compte, plusieurs téléphones ; jamais au nom d''un autre';
END $$;
RESET ROLE;
-- B se connecte sur le téléphone de A : le jeton passe à B, A ne le voit plus.
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  IF (SELECT count(*) FROM public.appareils_push) <> 0 THEN RAISE EXCEPTION 'N2 : B voit les téléphones de A'; END IF;
  IF (SELECT count(*) FROM public.preferences_notifications) <> 0 THEN RAISE EXCEPTION 'N2 : B voit les réglages de A'; END IF;
  UPDATE public.preferences_notifications SET silence = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'N2 : B a modifié les réglages de A'; END IF;
END $$;
INSERT INTO public.appareils_push (user_id, jeton, plateforme) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ExponentPushToken[telephone-partage]', 'android');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT user_id FROM public.appareils_push WHERE jeton = 'ExponentPushToken[telephone-partage]') <> 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' THEN
    RAISE EXCEPTION 'N2 : le téléphone partagé est resté au compte de A';
  END IF;
  IF (SELECT count(*) FROM public.appareils_push WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1 THEN
    RAISE EXCEPTION 'N2 : A a perdu son autre téléphone';
  END IF;
  RAISE NOTICE 'N2 OK : un téléphone = le dernier compte connecté ; réglages et jetons privés';
END $$;
-- Déconnexion de A sur son second téléphone : il supprime sa ligne.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DELETE FROM public.appareils_push WHERE jeton = 'ExponentPushToken[second-telephone]';
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.appareils_push WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN RAISE EXCEPTION 'N3 : jeton non retiré'; END IF;
  RAISE NOTICE 'N3 OK : déconnexion = jeton retiré';
END $$;

-- ─── M47 : silence 20 h – 7 h (heure de Paris) ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF public.notifications_moment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', timestamp '2026-11-22 21:30' AT TIME ZONE 'Europe/Paris')
     <> timestamp '2026-11-23 07:00' AT TIME ZONE 'Europe/Paris' THEN RAISE EXCEPTION 'N4 : 21 h 30 → pas le lendemain 7 h'; END IF;
  IF public.notifications_moment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', timestamp '2026-11-23 05:10' AT TIME ZONE 'Europe/Paris')
     <> timestamp '2026-11-23 07:00' AT TIME ZONE 'Europe/Paris' THEN RAISE EXCEPTION 'N4 : 5 h 10 → pas 7 h le même jour'; END IF;
  IF public.notifications_moment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', timestamp '2026-11-23 12:00' AT TIME ZONE 'Europe/Paris')
     <> timestamp '2026-11-23 12:00' AT TIME ZONE 'Europe/Paris' THEN RAISE EXCEPTION 'N4 : midi décalé'; END IF;
  -- Été : 20 h 30 heure de Paris (UTC+2) → 7 h du lendemain heure de Paris.
  IF public.notifications_moment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', timestamp '2027-06-10 20:30' AT TIME ZONE 'Europe/Paris')
     <> timestamp '2027-06-11 07:00' AT TIME ZONE 'Europe/Paris' THEN RAISE EXCEPTION 'N4 : heure d''été mal gérée'; END IF;
  -- M : aucun réglage enregistré = silence activé par défaut.
  IF public.notifications_moment('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', timestamp '2026-11-22 23:00' AT TIME ZONE 'Europe/Paris')
     <> timestamp '2026-11-23 07:00' AT TIME ZONE 'Europe/Paris' THEN RAISE EXCEPTION 'N4 : défaut du silence'; END IF;
  -- Silence désactivé : tout de suite.
  UPDATE public.preferences_notifications SET silence = false WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF public.notifications_moment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', timestamp '2026-11-22 23:00' AT TIME ZONE 'Europe/Paris')
     <> timestamp '2026-11-22 23:00' AT TIME ZONE 'Europe/Paris' THEN RAISE EXCEPTION 'N4 : silence désactivé non respecté'; END IF;
  UPDATE public.preferences_notifications SET silence = true WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  RAISE NOTICE 'N4 OK : silence 20 h – 7 h heure de Paris (hiver, été, défaut, désactivé)';
END $$;

-- ─── M47 : mot envoyé à la classe (distribué à Eva et Félix) → A, M, J pour Eva ; B pour Félix ; brouillon : personne ─
INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, classe_id, signature_mode)
VALUES ('11111111-1111-4111-8111-111111111111', 'signature', 'Sortie au musée', 'Texte privé du mot', 'envoyé', :'ct', 'one') RETURNING id AS mot \gset
INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, classe_id, signature_mode)
VALUES ('11111111-1111-4111-8111-111111111111', 'information', 'Brouillon', 'x', 'brouillon', :'ct', 'none') RETURNING id AS brouillon \gset
-- Un brouillon placé à la main dans un carnet n'est jamais notifié.
INSERT INTO public.mot_carnets (mot_id, child_id) SELECT :'brouillon', :'eva'
WHERE NOT EXISTS (SELECT 1 FROM public.mot_carnets WHERE mot_id = :'brouillon' AND child_id = :'eva');
SELECT set_config('test.mot', :'mot', true) \gset
SELECT set_config('test.felix', :'felix', true) \gset
DO $$ BEGIN
  IF (SELECT array_agg(destinataire::text ORDER BY destinataire::text) FROM public.notifications_file
      WHERE type = 'mot' AND ref_id = current_setting('test.mot')::uuid AND child_id = current_setting('test.eva')::uuid)
     <> ARRAY['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'] THEN
    RAISE EXCEPTION 'N5 : destinataires du mot pour Eva faux';
  END IF;
  IF (SELECT array_agg(destinataire::text) FROM public.notifications_file
      WHERE type = 'mot' AND ref_id = current_setting('test.mot')::uuid AND child_id = current_setting('test.felix')::uuid)
     <> ARRAY['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'] THEN
    RAISE EXCEPTION 'N5 : destinataires du mot pour Félix faux';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notifications_file WHERE expediteur <> 'Claire Martin' AND type = 'mot') THEN RAISE EXCEPTION 'N5 : expéditeur faux'; END IF;
  IF (SELECT count(*) FROM public.notifications_file WHERE type = 'mot') <> 4 THEN RAISE EXCEPTION 'N5 : un brouillon a été notifié'; END IF;
  RAISE NOTICE 'N5 OK : mot → chaque carnet notifie SES responsables (deux foyers pour Eva), expéditeur « Claire Martin », brouillon ignoré';
END $$;

-- ─── M47 : messages — fil foyer de A (A et M seulement), fil individuel de J (J seul), message d'un parent (rien) ───
INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, foyer_id)
VALUES ('11111111-1111-4111-8111-111111111111', :'eva', 'foyer', :'foyer_a') RETURNING id AS fil_a \gset
INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, parent_id)
VALUES ('11111111-1111-4111-8111-111111111111', :'eva', 'individuel', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') RETURNING id AS fil_j \gset
INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text) VALUES (:'fil_a', 'teacher', '11111111-1111-4111-8111-111111111111', 'Texte privé pour le foyer de A');
INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text) VALUES (:'fil_j', 'teacher', '11111111-1111-4111-8111-111111111111', 'Texte privé pour J');
INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text) VALUES (:'fil_a', 'parent', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Réponse de A');
SELECT set_config('test.fil_a', :'fil_a', true) \gset
SELECT set_config('test.fil_j', :'fil_j', true) \gset
DO $$ BEGIN
  IF (SELECT array_agg(destinataire::text ORDER BY destinataire::text) FROM public.notifications_file WHERE type = 'message' AND ref_id = current_setting('test.fil_a')::uuid)
     <> ARRAY['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'] THEN
    RAISE EXCEPTION 'N6 : fil du foyer de A — destinataires faux (l''autre foyer ne doit rien recevoir)';
  END IF;
  IF (SELECT array_agg(destinataire::text) FROM public.notifications_file WHERE type = 'message' AND ref_id = current_setting('test.fil_j')::uuid)
     <> ARRAY['dddddddd-dddd-4ddd-8ddd-dddddddddddd'] THEN
    RAISE EXCEPTION 'N6 : fil individuel de J — destinataires faux';
  END IF;
  IF (SELECT count(*) FROM public.notifications_file WHERE type = 'message') <> 3 THEN RAISE EXCEPTION 'N6 : un message de parent a été notifié'; END IF;
  RAISE NOTICE 'N6 OK : message → foyer du fil seulement ; fil individuel → ce parent seul ; message d''un parent → rien';
END $$;

-- ─── M47 : absence signalée par l'école → responsables ; par un parent → rien ──────────────────────────────────────
INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
VALUES (:'eva', CURRENT_DATE, 'journee', 'maladie', '11111111-1111-4111-8111-111111111111');
INSERT INTO public.absences (student_id, date_debut, demi_journee, motif, signalee_par)
VALUES (:'eva', CURRENT_DATE + 3, 'journee', 'rendez_vous', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.notifications_file WHERE type = 'absence_a_justifier') <> 3 THEN
    RAISE EXCEPTION 'N7 : absence à justifier — 3 notifications attendues (école), aucune pour l''absence signalée par A';
  END IF;
  RAISE NOTICE 'N7 OK : absence signalée par l''école → les responsables ; signalée par un parent → rien';
END $$;

-- ─── M47 : rien pour une photo, une compétence, un document ; jamais de texte dans la file ─────────────────────────
DO $$ DECLARE avant int := (SELECT count(*) FROM public.notifications_file); BEGIN
  INSERT INTO public.carnet_items (child_id, categorie, titre, date, ajoute_par, visibilite)
  VALUES (current_setting('test.eva')::uuid, 'souvenir', 'Photo', CURRENT_DATE, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'foyer');
  INSERT INTO public.carnet_items (child_id, categorie, titre, date, ajoute_par, visibilite)
  VALUES (current_setting('test.eva')::uuid, 'livret', 'Livret', CURRENT_DATE, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'foyer');
  IF (SELECT count(*) FROM public.notifications_file) <> avant THEN RAISE EXCEPTION 'N8 : un ajout au carnet a été notifié'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications_file'
             AND column_name IN ('text', 'texte', 'contenu', 'motif', 'commentaire', 'chemin', 'justificatif')) THEN
    RAISE EXCEPTION 'N8 : la file a une colonne de contenu';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notifications_file WHERE expediteur ILIKE '%privé%' OR expediteur ILIKE '%maladie%') THEN
    RAISE EXCEPTION 'N8 : du contenu dans la file';
  END IF;
  RAISE NOTICE 'N8 OK : rien pour un ajout au carnet ; la file ne contient ni texte, ni motif, ni justificatif';
END $$;

-- ─── Droits : aucun compte ne lit la file ; fonctions exécutables par personne ────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM public.notifications_file LIMIT 1;
    RAISE EXCEPTION 'N9 : un compte lit la file';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'N9 OK : la file n''est lisible par aucun compte';
END $$;
RESET ROLE;
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['public.notifications_moment(uuid,timestamptz)', 'public.notifications_ajouter(uuid,uuid,text,text,uuid)',
    'public.notifications_nom(uuid)', 'public.notifications_sur_mot()', 'public.notifications_sur_message()',
    'public.notifications_sur_absence()', 'public.appareils_push_un_compte()'] LOOP
    IF has_function_privilege('authenticated', f, 'EXECUTE') OR has_function_privilege('anon', f, 'EXECUTE') THEN
      RAISE EXCEPTION 'N10 : % exécutable par un compte', f;
    END IF;
  END LOOP;
  RAISE NOTICE 'N10 OK : aucune fonction de notification exécutable par un compte';
END $$;

ROLLBACK;
\echo 'M46-M47 : 10 tests OK'
