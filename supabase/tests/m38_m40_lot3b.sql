-- Tests M38 (compteur « ont lu »), M39 (mot complet), M40 (annonce seule) — lot 3b, plan : tasks/lot3b-plan-sql.md.
-- Base LOCALE, données fictives, transaction annulée :
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m38_m40_lot3b.sql
-- Acteurs : T enseignant titulaire de CT ; T2 enseignant titulaire de CT2 ; A et B responsables SÉPARÉS de Eva
-- (A foyer 1, B foyer 2) ; A aussi responsable de Noé ; C responsable de Félix (autre famille, même classe CT).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 't@test.local',  'authenticated', 'authenticated', '{}', now()),
  ('22222222-2222-4222-8222-222222222222', 't2@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local',  'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local',  'authenticated', 'authenticated', '{"role":"parent"}', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local',  'authenticated', 'authenticated', '{"role":"parent"}', now());
UPDATE public.profiles SET role = 'enseignant'
 WHERE id IN ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
INSERT INTO public.ecoles (nom) VALUES ('École lot 3b') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CE1', 'CE1 de T', '11111111-1111-4111-8111-111111111111') RETURNING id AS ct \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CE2', 'CE2 de T2', '22222222-2222-4222-8222-222222222222') RETURNING id AS ct2 \gset

-- Enfants créés par leurs responsables (create_child : enfant + foyer + responsable + année).
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Eva', 'Test', NULL, 7, 'CE1', 'École lot 3b')).id AS eva \gset
SELECT (public.create_child('Noé', 'Test', NULL, 8, 'CE1', 'École lot 3b')).id AS noe \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT (public.create_child('Félix', 'Autre', NULL, 7, 'CE1', 'École lot 3b')).id AS felix \gset
RESET ROLE;
UPDATE public.academic_years SET classe_id = :'ct' WHERE student_id IN (:'eva', :'noe', :'felix');
-- B : responsable séparé d'Eva, dans SON foyer.
INSERT INTO public.foyers (nom, created_by) VALUES ('Foyer de B', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') RETURNING id AS foyer_b \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id) VALUES (:'foyer_b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', :'eva');
SELECT foyer_id AS foyer_a FROM public.responsables WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND child_id = :'eva' \gset

-- Mots (créés par le serveur pour le décor) : M = signature + question (T) ; MI = information (T) ;
-- M2 = mot de T2 dans le carnet d'Eva ; M3 = mot de T dans le seul carnet de Félix.
INSERT INTO public.mots_liaison (teacher_id, classe_id, classe, type, titre, contenu, statut, signature_mode, question, question_libelle)
VALUES ('11111111-1111-4111-8111-111111111111', :'ct', 'CE1 de T', 'signature', 'Sortie', 'x', 'envoyé', 'both', true, 'Votre enfant viendra-t-il ?')
RETURNING id AS m \gset
INSERT INTO public.mots_liaison (teacher_id, classe_id, classe, type, titre, contenu, statut, signature_mode)
VALUES ('11111111-1111-4111-8111-111111111111', :'ct', 'CE1 de T', 'information', 'Info', 'x', 'envoyé', 'none') RETURNING id AS mi \gset
INSERT INTO public.mots_liaison (teacher_id, classe_id, classe, type, titre, contenu, statut, signature_mode)
VALUES ('22222222-2222-4222-8222-222222222222', :'ct2', 'CE2 de T2', 'information', 'Mot de T2', 'x', 'envoyé', 'none') RETURNING id AS m2 \gset
-- M3 sans classe : pas de distribution automatique, une seule copie (Félix).
INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, signature_mode)
VALUES ('11111111-1111-4111-8111-111111111111', 'information', 'Pour Félix', 'x', 'envoyé', 'none') RETURNING id AS m3 \gset
-- Un mot envoyé à une classe est distribué automatiquement à chaque élève (déclencheur) : on complète sans doublon.
INSERT INTO public.mot_carnets (mot_id, child_id) VALUES
  (:'m', :'eva'), (:'m', :'noe'), (:'m', :'felix'), (:'mi', :'eva'), (:'m2', :'eva'), (:'m3', :'felix')
ON CONFLICT (mot_id, child_id) DO NOTHING;

-- Fils avec T : individuel de A, individuel de B, fil FOYER du foyer de A.
INSERT INTO public.teacher_conversations (teacher_id, parent_id, student_id, portee) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', :'eva', 'individuel') RETURNING id AS fil_a \gset
INSERT INTO public.teacher_conversations (teacher_id, parent_id, student_id, portee) VALUES
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', :'eva', 'individuel') RETURNING id AS fil_b \gset
INSERT INTO public.teacher_conversations (teacher_id, foyer_id, student_id, portee) VALUES
  ('11111111-1111-4111-8111-111111111111', :'foyer_a', :'eva', 'foyer') RETURNING id AS fil_foyer \gset
-- Annonces : une dans CT (classe de T), une dans CT2.
INSERT INTO public.class_posts (teacher_id, classe_id, classe, type, title, content) VALUES
  ('11111111-1111-4111-8111-111111111111', :'ct', 'CE1 de T', 'annonce', 'Annonce CT', 'x') RETURNING id AS post \gset
INSERT INTO public.class_posts (teacher_id, classe_id, classe, type, title, content) VALUES
  ('22222222-2222-4222-8222-222222222222', :'ct2', 'CE2 de T2', 'annonce', 'Annonce CT2', 'x') RETURNING id AS post2 \gset
-- Réaction posée AVANT M40 par C (conservée en base).
INSERT INTO public.class_post_reactions (post_id, user_id, emoji) VALUES (:'post', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '👍');

SELECT set_config('test.ct', :'ct', true), set_config('test.ct2', :'ct2', true), set_config('test.eva', :'eva', true),
       set_config('test.noe', :'noe', true), set_config('test.felix', :'felix', true), set_config('test.m', :'m', true),
       set_config('test.mi', :'mi', true), set_config('test.m2', :'m2', true), set_config('test.m3', :'m3', true),
       set_config('test.fil_a', :'fil_a', true), set_config('test.fil_b', :'fil_b', true),
       set_config('test.fil_foyer', :'fil_foyer', true), set_config('test.post', :'post', true),
       set_config('test.post2', :'post2', true) \gset

-- ═══ M39 — mot complet ═══════════════════════════════════════════════════════
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  INSERT INTO public.mots_liaison (teacher_id, classe_id, classe, type, titre, contenu, statut, signature_mode, question, question_libelle)
  VALUES (auth.uid(), current_setting('test.ct')::uuid, 'CE1 de T', 'signature', 'Mot complet', 'x', 'brouillon', 'both', true, 'Présent ?');
  RAISE NOTICE 'OK T1 un mot porte à la fois une signature (les deux parents) et une question avec libellé';
  BEGIN
    INSERT INTO public.mots_liaison (teacher_id, classe_id, classe, type, titre, contenu, statut, signature_mode, question, question_libelle)
    VALUES (auth.uid(), current_setting('test.ct')::uuid, 'CE1 de T', 'information', 'x', 'x', 'brouillon', 'none', false, 'Libellé seul');
    RAISE EXCEPTION 'ÉCHEC T2 libellé sans question accepté';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.mots_liaison (teacher_id, classe_id, classe, type, titre, contenu, statut, signature_mode, question)
    VALUES (auth.uid(), current_setting('test.ct')::uuid, 'CE1 de T', 'autorisation', 'x', 'x', 'brouillon', 'one', true);
    RAISE EXCEPTION 'ÉCHEC T2 question sur une autorisation acceptée';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RAISE NOTICE 'OK T2 refusés : libellé sans question, question sur une autorisation';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  INSERT INTO public.reponses_mot (mot_id, child_id, responsable_id, participation)
  VALUES (current_setting('test.m')::uuid, current_setting('test.eva')::uuid, auth.uid(), 'peut_etre');
  BEGIN
    INSERT INTO public.reponses_mot (mot_id, child_id, responsable_id, participation)
    VALUES (current_setting('test.m')::uuid, current_setting('test.eva')::uuid, auth.uid(), 'oui');
    RAISE EXCEPTION 'ÉCHEC T3 deuxième réponse de A pour le même carnet';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  RAISE NOTICE 'OK T3 A répond « peut-être » pour Eva ; une 2e réponse pour le même carnet est refusée';
  BEGIN
    INSERT INTO public.reponses_mot (mot_id, child_id, responsable_id, participation)
    VALUES (current_setting('test.mi')::uuid, current_setting('test.eva')::uuid, auth.uid(), 'oui');
    RAISE EXCEPTION 'ÉCHEC T4 réponse à un mot d''information';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.reponses_mot (mot_id, child_id, responsable_id, autorisation)
    VALUES (current_setting('test.m')::uuid, current_setting('test.noe')::uuid, auth.uid(), true);
    RAISE EXCEPTION 'ÉCHEC T4 oui/non à un mot qui n''est pas une autorisation';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RAISE NOTICE 'OK T4 refusés : réponse à un mot d''information, oui/non à un mot qui n''est pas une autorisation';
  -- Réponse privée dans SON fil individuel, en citant le mot.
  INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text, mot_id)
  VALUES (current_setting('test.fil_a')::uuid, 'parent', auth.uid(), 'Réponse privée de A', current_setting('test.m')::uuid);
  RAISE NOTICE 'OK T6 A répond en privé à T en citant le mot (fil individuel)';
  BEGIN
    INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text, mot_id)
    VALUES (current_setting('test.fil_foyer')::uuid, 'parent', auth.uid(), 'Dans le fil du foyer', current_setting('test.m')::uuid);
    RAISE EXCEPTION 'ÉCHEC T7 réponse à un mot dans le fil FOYER';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T7 refusé : citer un mot dans le fil partagé du foyer';
  BEGIN
    INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text, mot_id)
    VALUES (current_setting('test.fil_a')::uuid, 'parent', auth.uid(), 'Mot de T2', current_setting('test.m2')::uuid);
    RAISE EXCEPTION 'ÉCHEC T8 citation d''un mot d''un autre enseignant';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text, mot_id)
    VALUES (current_setting('test.fil_a')::uuid, 'parent', auth.uid(), 'Mot de Félix', current_setting('test.m3')::uuid);
    RAISE EXCEPTION 'ÉCHEC T8 citation d''un mot hors du carnet de l''élève';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T8 refusés : citer le mot d''un autre enseignant, ou un mot hors du carnet de l''élève';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  INSERT INTO public.reponses_mot (mot_id, child_id, responsable_id, participation)
  VALUES (current_setting('test.m')::uuid, current_setting('test.eva')::uuid, auth.uid(), 'oui');
  RAISE NOTICE 'OK T3 bis B (séparé) donne SA réponse pour Eva';
  IF (SELECT count(*) FROM public.teacher_messages WHERE mot_id = current_setting('test.m')::uuid) <> 0
     OR (SELECT count(*) FROM public.teacher_messages WHERE conversation_id = current_setting('test.fil_a')::uuid) <> 0 THEN
    RAISE EXCEPTION 'ÉCHEC T9 le parent séparé voit la réponse privée de A';
  END IF;
  RAISE NOTICE 'OK T9 B (parent séparé) ne voit PAS la réponse privée de A (0 message)';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.reponses_mot (mot_id, child_id, responsable_id, participation)
    VALUES (current_setting('test.m')::uuid, current_setting('test.eva')::uuid, auth.uid(), 'non');
    RAISE EXCEPTION 'ÉCHEC T5 C répond pour un enfant qui n''est pas le sien';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T5 refusé : C répond pour Eva';
  IF (SELECT count(*) FROM public.teacher_messages WHERE conversation_id = current_setting('test.fil_a')::uuid) <> 0 THEN
    RAISE EXCEPTION 'ÉCHEC T10 une autre famille voit la réponse privée';
  END IF;
  RAISE NOTICE 'OK T10 C (autre famille) : 0 message';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.teacher_messages
      WHERE conversation_id = current_setting('test.fil_a')::uuid AND mot_id = current_setting('test.m')::uuid) <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC T11 T ne voit pas la réponse privée qui cite son mot';
  END IF;
  INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
  VALUES (current_setting('test.fil_a')::uuid, 'teacher', auth.uid(), 'Message de T');
  RAISE NOTICE 'OK T11 T lit la réponse privée de A et le mot cité';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    UPDATE public.teacher_messages SET text = 'réécrit par A'
     WHERE conversation_id = current_setting('test.fil_a')::uuid AND sender_role = 'teacher';
    RAISE EXCEPTION 'ÉCHEC T12 A réécrit le message de T';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.teacher_messages SET read = true
   WHERE conversation_id = current_setting('test.fil_a')::uuid AND sender_role = 'teacher';
  IF NOT FOUND THEN RAISE EXCEPTION 'ÉCHEC T12 A ne peut pas marquer le message lu'; END IF;
  RAISE NOTICE 'OK T12 A ne peut pas réécrire le message de T, mais le marque « lu »';
END $$;
RESET ROLE;

-- ═══ M40 — annonce seule ══════════════════════════════════════════════════════
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.class_posts (teacher_id, classe_id, classe, type, title, content)
    VALUES (auth.uid(), current_setting('test.ct')::uuid, 'CE1 de T', 'annonce', 'Message d''un parent', 'x');
    RAISE EXCEPTION 'ÉCHEC T14 un parent publie dans le fil de classe';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T14 refusé : un parent publie dans le fil de classe';
  UPDATE public.class_posts SET title = 'modifié par A' WHERE id = current_setting('test.post')::uuid;
  IF FOUND THEN RAISE EXCEPTION 'ÉCHEC T15 A modifie l''annonce de T'; END IF;
  DELETE FROM public.class_posts WHERE id = current_setting('test.post')::uuid;
  IF FOUND THEN RAISE EXCEPTION 'ÉCHEC T15 A supprime l''annonce de T'; END IF;
  RAISE NOTICE 'OK T15 A ne modifie ni ne supprime une annonce';
  IF (SELECT count(*) FROM public.class_posts WHERE id = current_setting('test.post')::uuid) <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC T16 A ne lit pas l''annonce de la classe d''Eva';
  END IF;
  IF (SELECT count(*) FROM public.class_posts WHERE id = current_setting('test.post2')::uuid) <> 0 THEN
    RAISE EXCEPTION 'ÉCHEC T16 A lit l''annonce d''une autre classe';
  END IF;
  RAISE NOTICE 'OK T16 A lit l''annonce de la classe d''Eva, pas celle d''une autre classe';
  BEGIN
    INSERT INTO public.class_post_reactions (post_id, user_id, emoji) VALUES (current_setting('test.post')::uuid, auth.uid(), '❤️');
    RAISE EXCEPTION 'ÉCHEC T17 A réagit à une annonce';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T17 refusé : réagir à une annonce';
  IF (SELECT count(*) FROM public.class_post_reactions) <> 0 THEN RAISE EXCEPTION 'ÉCHEC T18 A voit la réaction de C'; END IF;
  RAISE NOTICE 'OK T18 A ne voit pas la réaction posée par une autre famille';
  BEGIN
    INSERT INTO public.messages (sender_id, receiver_id, body) VALUES (auth.uid(), '11111111-1111-4111-8111-111111111111', 'x');
    RAISE EXCEPTION 'ÉCHEC T19 A écrit à T dans messages';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.messages (sender_id, receiver_id, body) VALUES (auth.uid(), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'x');
    RAISE EXCEPTION 'ÉCHEC T19 A écrit à B dans messages';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.messages (sender_id, receiver_id, body) VALUES (auth.uid(), 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'x');
    RAISE EXCEPTION 'ÉCHEC T19 A écrit à C (autre famille) dans messages';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T19 refusé : écrire dans messages (à T, à B, à C)';
  -- M38 : A lit le mot (une seule fois, par mot).
  INSERT INTO public.read_receipts (mot_id, parent_id) VALUES (current_setting('test.m')::uuid, auth.uid());
  -- T24 : après M40, les messages parent → enseignant passent par teacher_messages (fils), pas par messages.
  INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
  VALUES (current_setting('test.fil_a')::uuid, 'parent', auth.uid(), 'T24 message simple de A (individuel)');
  INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
  VALUES (current_setting('test.fil_foyer')::uuid, 'parent', auth.uid(), 'T24 message simple de A (foyer)');
  RAISE NOTICE 'OK T24 après M40, A écrit à T sans citer de mot, dans son fil individuel et dans le fil du foyer';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
  VALUES (current_setting('test.fil_b')::uuid, 'parent', auth.uid(), 'T24 message simple de B (individuel)');
  IF (SELECT count(*) FROM public.teacher_messages WHERE text LIKE 'T24 % de A %') <> 0 THEN
    RAISE EXCEPTION 'ÉCHEC T24 B (séparé, autre foyer) voit un message de A';
  END IF;
  BEGIN
    INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
    VALUES (current_setting('test.fil_a')::uuid, 'parent', auth.uid(), 'B écrit dans le fil de A');
    RAISE EXCEPTION 'ÉCHEC T24 B écrit dans le fil individuel de A';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T24 bis B écrit dans SON fil ; il ne voit pas les messages de A et ne peut pas écrire dans le fil de A';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.teacher_messages WHERE text LIKE 'T24 %' AND sender_role = 'parent') <> 3 THEN
    RAISE EXCEPTION 'ÉCHEC T24 ter T ne reçoit pas les 3 messages des parents';
  END IF;
  UPDATE public.teacher_messages SET read = true WHERE text LIKE 'T24 %';
  IF NOT FOUND THEN RAISE EXCEPTION 'ÉCHEC T24 ter T ne peut pas marquer lus les messages des parents'; END IF;
  RAISE NOTICE 'OK T24 ter T reçoit les 3 messages (A individuel, A foyer, B individuel) et les marque lus';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE d int; l int; BEGIN
  IF (SELECT count(*) FROM public.class_post_reactions WHERE post_id = current_setting('test.post')::uuid) <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC T18 T ne voit pas la réaction sur son annonce';
  END IF;
  RAISE NOTICE 'OK T18 bis T voit la réaction posée sur son annonce';
  -- ═══ M38 — compteur « ont lu » ═══
  SELECT eleves_destinataires, eleves_lus INTO d, l FROM public.lectures_mot(current_setting('test.m')::uuid);
  IF d <> 3 OR l <> 2 THEN RAISE EXCEPTION 'ÉCHEC T21-22 compteur : % destinataires, % lus (attendu 3 et 2)', d, l; END IF;
  RAISE NOTICE 'OK T21-22 une lecture de A compte Eva ET Noé (ses deux carnets) ; Félix non lu : 2 lus sur 3';
END $$;
RESET ROLE;

-- B lit aussi : Eva reste comptée UNE fois.
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
INSERT INTO public.read_receipts (mot_id, parent_id) VALUES (:'m', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.lectures_mot(current_setting('test.m')::uuid)) THEN
    RAISE EXCEPTION 'ÉCHEC T23 un parent obtient le compteur';
  END IF;
  RAISE NOTICE 'OK T23 B (parent) n''obtient aucun nombre';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ DECLARE l int; BEGIN
  SELECT eleves_lus INTO l FROM public.lectures_mot(current_setting('test.m')::uuid);
  IF l <> 2 THEN RAISE EXCEPTION 'ÉCHEC T21 bis Eva comptée deux fois (% lus)', l; END IF;
  RAISE NOTICE 'OK T21 bis A et B ont lu : Eva comptée une seule fois (2 lus)';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.lectures_mot(current_setting('test.m')::uuid)) THEN
    RAISE EXCEPTION 'ÉCHEC T23 un autre enseignant obtient le compteur';
  END IF;
  RAISE NOTICE 'OK T23 bis T2 (autre enseignant) n''obtient aucun nombre';
END $$;
RESET ROLE;

ROLLBACK;
\echo 'Tests lot 3b (M38, M39, M40) : terminé, transaction annulée.'
