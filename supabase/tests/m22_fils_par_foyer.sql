-- Tests M22 · fils parent ↔ enseignant par foyer (RLS complètes).
-- À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m22_fils_par_foyer.sql
--
-- Lucas a DEUX foyers : F1 = Claire (A) et Marc (B) ; F2 = Sophie (C). D : inconnu.
-- T : titulaire de la classe de Lucas. U : autre enseignant.

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@test.local', 'authenticated', 'authenticated', '{}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 't@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'u@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}');
UPDATE public.profiles SET first_name = 'Claire', family_name = 'Moreau' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
UPDATE public.profiles SET first_name = 'Marc', family_name = 'Moreau' WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
UPDATE public.profiles SET first_name = 'Sophie', family_name = 'Martin' WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
UPDATE public.profiles SET first_name = 'Anne', family_name = 'Dupont', role = 'enseignant' WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
UPDATE public.profiles SET role = 'enseignant' WHERE id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS lucas FROM public.create_child('Lucas', 'Moreau', NULL, 10, 'CM2', 'École test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset
SELECT foyer_id AS f1 FROM public.responsables WHERE child_id = :'lucas' \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien) VALUES (:'f1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', :'lucas', 'parent');
INSERT INTO public.foyers (nom, created_by) VALUES ('Foyer Martin', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') RETURNING id AS f2 \gset
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien) VALUES (:'f2', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', :'lucas', 'parent');
SELECT id AS ay FROM public.academic_years WHERE student_id = :'lucas' \gset
INSERT INTO public.ecoles (nom) VALUES ('École test') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', (SELECT annee_scolaire FROM public.academic_years WHERE id = :'ay'), 'CM2', 'CM2 B', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
  RETURNING id AS classe \gset
UPDATE public.academic_years SET classe_id = :'classe', statut = 'active' WHERE id = :'ay';
SELECT set_config('test.lucas', :'lucas', true), set_config('test.f1', :'f1', true), set_config('test.f2', :'f2', true) \gset

-- ─── A : fil famille (F1) et fil individuel ─────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_fil uuid; v_ind uuid;
BEGIN
  INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, foyer_id)
    VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', current_setting('test.lucas')::uuid, 'foyer', current_setting('test.f1')::uuid)
    RETURNING id INTO v_fil;
  PERFORM set_config('test.fil_f1', v_fil::text, false);
  RAISE NOTICE 'OK T1 A crée le fil famille de SON foyer avec la titulaire';
  BEGIN
    INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, foyer_id)
      VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', current_setting('test.lucas')::uuid, 'foyer', current_setting('test.f2')::uuid);
    RAISE EXCEPTION 'ÉCHEC T2 A a créé le fil du foyer F2';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T2 refusé : créer le fil famille d''un autre foyer';
  END;
  BEGIN
    INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, parent_id)
      VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff', current_setting('test.lucas')::uuid, 'individuel', auth.uid());
    RAISE EXCEPTION 'ÉCHEC T3 fil avec un enseignant non titulaire';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T3 refusé : fil avec un enseignant qui n''est pas le titulaire';
  END;
  INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
    VALUES (v_fil, 'parent', auth.uid(), 'Bonjour, Lucas sera en retard demain.');
  RAISE NOTICE 'OK T4a A écrit dans le fil famille';
  BEGIN
    INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
      VALUES (v_fil, 'teacher', auth.uid(), 'Usurpation');
    RAISE EXCEPTION 'ÉCHEC T4b rôle enseignant usurpé';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T4b refusé : écrire en se faisant passer pour l''enseignant';
  END;
  BEGIN
    INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
      VALUES (v_fil, 'parent', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Au nom de Marc');
    RAISE EXCEPTION 'ÉCHEC T4c écrire au nom d''un autre';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T4c refusé : écrire au nom de l''autre responsable';
  END;
  -- « Seulement moi » : fil individuel de A.
  INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, parent_id)
    VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', current_setting('test.lucas')::uuid, 'individuel', auth.uid())
    RETURNING id INTO v_ind;
  PERFORM set_config('test.fil_ind', v_ind::text, false);
  INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
    VALUES (v_ind, 'parent', auth.uid(), 'Message personnel');
  RAISE NOTICE 'OK T5 A crée son fil individuel (« Seulement moi ») et y écrit';
  BEGIN
    INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, parent_id)
      VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', current_setting('test.lucas')::uuid, 'individuel', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'ÉCHEC T5b A a créé un fil individuel pour Marc';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T5b refusé : créer le fil individuel d''un autre responsable';
  END;
END $$;
RESET ROLE;

-- ─── B (même foyer) : voit le fil famille et l'auteur ; ne voit PAS le fil individuel de A ─────
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int; auteur uuid;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE id = current_setting('test.fil_f1')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T6 B ne voit pas le fil famille'; END IF;
  SELECT sender_id INTO auteur FROM public.teacher_messages WHERE conversation_id = current_setting('test.fil_f1')::uuid;
  IF auteur <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' THEN RAISE EXCEPTION 'ÉCHEC T6b auteur perdu'; END IF;
  INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
    VALUES (current_setting('test.fil_f1')::uuid, 'parent', auth.uid(), 'Je confirme, Marc.');
  RAISE NOTICE 'OK T6 même foyer : B lit le fil famille (auteur A conservé) et y répond';
  IF public.fil_enseignant(current_setting('test.fil_f1')::uuid) IS DISTINCT FROM 'Anne Dupont' THEN RAISE EXCEPTION 'ÉCHEC T6c nom de l''enseignante'; END IF;
  IF public.fil_enseignant(current_setting('test.fil_ind')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'ÉCHEC T6d nom via un fil illisible'; END IF;
  RAISE NOTICE 'OK T6c fil_enseignant : « Anne Dupont » (nom seul) ; rien pour un fil illisible';
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE id = current_setting('test.fil_ind')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T7 B voit le fil individuel de A'; END IF;
  SELECT count(*) INTO n FROM public.teacher_messages WHERE conversation_id = current_setting('test.fil_ind')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T7b B lit un message du fil individuel de A'; END IF;
  BEGIN
    INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text)
      VALUES (current_setting('test.fil_ind')::uuid, 'parent', auth.uid(), 'Intrusion');
    RAISE EXCEPTION 'ÉCHEC T7c B écrit dans le fil individuel de A';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T7 fil individuel de A invisible et fermé pour B (même foyer)';
END $$;
RESET ROLE;

-- ─── C (autre foyer) : ne voit rien de F1 ───────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_conversations;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T8 C voit % fil(s) de l''autre foyer', n; END IF;
  SELECT count(*) INTO n FROM public.teacher_messages;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T8b C lit % message(s) de l''autre foyer', n; END IF;
  RAISE NOTICE 'OK T8 autre foyer : aucun fil ni message de F1 visible';
END $$;
RESET ROLE;

-- ─── T (titulaire) : « Tous les représentants » ; U (autre enseignant) : rien ────────────────
SELECT set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_envoi uuid; n int;
BEGIN
  v_envoi := public.envoyer_a_tous_les_representants(current_setting('test.lucas')::uuid, 'Réunion de classe jeudi à 17h30.');
  SELECT count(*) INTO n FROM public.teacher_messages WHERE envoi_id = v_envoi;
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T9 % copies (attendu 2 : un fil par foyer)', n; END IF;
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE portee = 'foyer';
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T9b % fils famille (attendu 2)', n; END IF;
  RAISE NOTICE 'OK T9 « Tous les représentants » : une copie dans le fil famille de chaque foyer (F2 créé)';
  SELECT count(*) INTO n FROM public.teacher_conversations;
  IF n <> 3 THEN RAISE EXCEPTION 'ÉCHEC T10 le titulaire voit % fils (attendu 3)', n; END IF;
  RAISE NOTICE 'OK T10 le titulaire voit ses 3 fils (2 famille + 1 individuel)';
  BEGIN
    UPDATE public.teacher_conversations SET portee = 'individuel', foyer_id = NULL, parent_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
     WHERE id = current_setting('test.fil_f1')::uuid;
    RAISE EXCEPTION 'ÉCHEC T11 participants modifiés';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T11 refusé : changer les participants d''un fil';
  END;
  BEGIN
    UPDATE public.teacher_messages SET text = 'Réécrit' WHERE conversation_id = current_setting('test.fil_f1')::uuid AND sender_role = 'parent';
    RAISE EXCEPTION 'ÉCHEC T12 message réécrit';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.teacher_messages SET read = true WHERE conversation_id = current_setting('test.fil_f1')::uuid AND sender_role = 'parent';
  RAISE NOTICE 'OK T12 un message ne se réécrit pas ; « lu » se met à jour';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffffff","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_conversations;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T13 un autre enseignant voit % fil(s)', n; END IF;
  BEGIN
    PERFORM public.envoyer_a_tous_les_representants(current_setting('test.lucas')::uuid, 'Intrusion');
    RAISE EXCEPTION 'ÉCHEC T13b un non-titulaire écrit aux représentants';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T13 un enseignant ne voit que ses fils ; non-titulaire : envoi refusé';
END $$;
RESET ROLE;

-- ─── « Envoyé aussi à » : prénoms de l'autre foyer, jamais ses réponses ─────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_msg uuid; noms text;
BEGIN
  SELECT id INTO v_msg FROM public.teacher_messages WHERE conversation_id = current_setting('test.fil_f1')::uuid AND envoi_id IS NOT NULL;
  SELECT string_agg(n, ', ' ORDER BY n) INTO noms FROM public.envoye_aussi_a(v_msg) n;
  IF noms IS DISTINCT FROM 'Sophie' THEN RAISE EXCEPTION 'ÉCHEC T14 envoyé aussi à = %', noms; END IF;
  RAISE NOTICE 'OK T14 A : « Envoyé aussi à Sophie » (autre foyer), sans Marc (même foyer)';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_msg uuid; noms text; n int;
BEGIN
  SELECT id INTO v_msg FROM public.teacher_messages WHERE envoi_id IS NOT NULL;
  SELECT string_agg(x, ', ' ORDER BY x) INTO noms FROM public.envoye_aussi_a(v_msg) x;
  IF noms IS DISTINCT FROM 'Claire, Marc' THEN RAISE EXCEPTION 'ÉCHEC T15 envoyé aussi à = %', noms; END IF;
  SELECT count(*) INTO n FROM public.teacher_messages;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T15b C lit % message(s) (attendu : sa seule copie)', n; END IF;
  RAISE NOTICE 'OK T15 C : « Envoyé aussi à Claire, Marc » ; il ne lit que sa copie, jamais les réponses de F1';
END $$;
RESET ROLE;

-- ─── D (inconnu) et anonyme ────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.teacher_conversations;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T16 un inconnu voit % fil(s)', n; END IF;
  BEGIN
    INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, parent_id)
      VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', current_setting('test.lucas')::uuid, 'individuel', auth.uid());
    RAISE EXCEPTION 'ÉCHEC T16b un inconnu ouvre un fil pour Lucas';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T16 inconnu : ne voit rien, ne peut pas ouvrir de fil';
END $$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$
DECLARE n int;
BEGIN
  BEGIN
    SELECT count(*) INTO n FROM public.teacher_conversations;
    IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T17 anon voit % fil(s)', n; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.peut_lire_fil(gen_random_uuid());
    RAISE EXCEPTION 'ÉCHEC T17b anon exécute peut_lire_fil';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.envoye_aussi_a(gen_random_uuid());
    RAISE EXCEPTION 'ÉCHEC T17c anon exécute envoye_aussi_a';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T17 anonyme : aucun fil, fonctions refusées';
END $$;
RESET ROLE;

\echo '── Tous les tests M22 sont passés ──'
ROLLBACK;
