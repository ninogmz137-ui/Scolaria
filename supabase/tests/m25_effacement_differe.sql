-- Tests M25 · effacement différé (L7, D6). À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m25_effacement_differe.sql
--
-- A (Claire) : seule responsable de Léa ; responsable d'Emma avec B (Marc). B a créé Tom, A en est aussi responsable.
-- C : compte sans lien.

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}', now());

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS lea FROM public.create_child('Léa', 'Moreau', NULL, 5, 'GS', 'École test') \gset
SELECT id AS emma FROM public.create_child('Emma', 'Moreau', NULL, 12, '5e', 'Collège test') \gset
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES (:'lea', auth.uid(), 'x@test.local') RETURNING id AS inv_lea \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"b@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS tom FROM public.create_child('Tom', 'Durand', NULL, 8, 'CE2', 'École test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset

-- B responsable d'Emma (foyer de A) ; A responsable de Tom (foyer de B).
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', child_id, 'parent' FROM public.responsables WHERE child_id = :'emma';
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', child_id, 'parent' FROM public.responsables WHERE child_id = :'tom';

SELECT id AS ay_lea FROM public.academic_years WHERE student_id = :'lea' \gset
SELECT id AS ay_emma FROM public.academic_years WHERE student_id = :'emma' \gset
SELECT :'lea' || '/' || :'ay_lea' || '/11111111-1111-4111-8111-111111111111.jpg' AS f_lea,
       :'emma' || '/' || :'ay_emma' || '/22222222-2222-4222-8222-222222222222.jpg' AS f_emma_b,
       :'emma' || '/' || :'ay_emma' || '/33333333-3333-4333-8333-333333333333.jpg' AS f_orphelin,
       :'emma' || '/' || :'ay_emma' || '/44444444-4444-4444-8444-444444444444.jpg' AS f_emma_b_prive \gset
-- Fichiers : A sous Léa ; B sous Emma (avec sa ligne, partagée au foyer) ; un fichier orphelin ancien.
INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
  ('carnet', :'f_lea', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('carnet', :'f_emma_b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('carnet', :'f_emma_b_prive', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO storage.objects (bucket_id, name, owner_id, created_at) VALUES
  ('carnet', :'f_orphelin', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '3 days');
INSERT INTO public.carnet_items (child_id, categorie, titre, fichier, ajoute_par, visibilite) VALUES
  (:'lea', 'souvenir', 'Dessin de Léa', :'f_lea', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'foyer'),
  (:'emma', 'souvenir', 'Photo par Marc', :'f_emma_b', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'foyer'),
  (:'emma', 'livret', 'Note privée de Marc', :'f_emma_b_prive', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'prive');

-- Un mot signé par B (Emma, une signature suffit) ; un fil famille et un fil individuel avec l'enseignant D.
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}', now());
INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, signature_mode)
  VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'signature', 'Sortie', 'Merci de signer', 'envoyé', 'one') RETURNING id AS mot \gset
INSERT INTO public.mot_carnets (mot_id, child_id, academic_year_id) VALUES (:'mot', :'emma', :'ay_emma');
INSERT INTO public.signatures (mot_id, student_id, parent_id) VALUES (:'mot', :'emma', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, foyer_id)
  SELECT 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'emma', 'foyer', foyer_id FROM public.responsables WHERE child_id = :'emma' LIMIT 1
  RETURNING id AS fil_foyer \gset
INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, parent_id)
  VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'emma', 'individuel', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') RETURNING id AS fil_indiv \gset
INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text) VALUES
  (:'fil_foyer', 'parent', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Emma sera absente lundi'),
  (:'fil_indiv', 'parent', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Message privé');
SELECT signed_at AS signe_le FROM public.signatures WHERE mot_id = :'mot' \gset
INSERT INTO public.alertes_urgence (auteur_id, child_id, categorie) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', :'lea', 'harcelement');

SELECT set_config('test.lea', :'lea', true), set_config('test.emma', :'emma', true), set_config('test.tom', :'tom', true),
       set_config('test.inv_lea', :'inv_lea', true), set_config('test.f_lea', :'f_lea', true),
       set_config('test.f_emma_b', :'f_emma_b', true), set_config('test.f_orphelin', :'f_orphelin', true),
       set_config('test.f_emma_b_prive', :'f_emma_b_prive', true), set_config('test.mot', :'mot', true),
       set_config('test.fil_foyer', :'fil_foyer', true), set_config('test.fil_indiv', :'fil_indiv', true),
       set_config('test.signe_le', :'signe_le', true) \gset

-- ─── A (seule responsable de Léa, co-responsable d'Emma) ─────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int; r record; v_id uuid;
BEGIN
  BEGIN
    PERFORM public.demander_effacement_enfant(current_setting('test.emma')::uuid);
    RAISE EXCEPTION 'ÉCHEC T1 effacement d''un enfant à 2 responsables accepté';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T1 refusé : Emma a 2 responsables (chacun peut seulement se retirer)';
  END;

  DELETE FROM public.children WHERE id = current_setting('test.lea')::uuid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T2 suppression immédiate encore possible'; END IF;
  RAISE NOTICE 'OK T2 plus de suppression immédiate d''un enfant (passe par la demande différée)';

  BEGIN
    INSERT INTO public.demandes_effacement (portee, child_id, user_id) VALUES ('enfant', current_setting('test.lea')::uuid, auth.uid());
    RAISE EXCEPTION 'ÉCHEC T3 écriture directe dans demandes_effacement';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T3 écriture directe refusée (fonctions seulement)';
  END;

  SELECT * INTO r FROM public.demander_effacement_enfant(current_setting('test.lea')::uuid);
  IF r.execution_prevue_le < now() + interval '29 days 23 hours' OR r.execution_prevue_le > now() + interval '30 days 1 hour' THEN
    RAISE EXCEPTION 'ÉCHEC T4 date d''exécution %', r.execution_prevue_le;
  END IF;
  RAISE NOTICE 'OK T4 demande pour Léa : exécution dans 30 jours';

  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.lea')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5 Léa encore visible'; END IF;
  SELECT count(*) INTO n FROM public.carnet_items WHERE child_id = current_setting('test.lea')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5b carnet de Léa encore visible'; END IF;
  SELECT count(*) INTO n FROM storage.objects WHERE name = current_setting('test.f_lea');
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5c A relit encore le fichier de Léa (%)', n; END IF;
  BEGIN
    INSERT INTO public.carnet_items (child_id, categorie, titre, ajoute_par) VALUES (current_setting('test.lea')::uuid, 'jalon', 'x', auth.uid());
    RAISE EXCEPTION 'ÉCHEC T5d ajout au carnet de Léa accepté';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T5 dès la demande : Léa et son carnet invisibles, plus aucun ajout possible';

  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.emma')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T6 Emma n''est plus visible'; END IF;
  RAISE NOTICE 'OK T6 les autres carnets (Emma) restent visibles';

  SELECT count(*) INTO n FROM public.mes_effacements() WHERE portee = 'enfant' AND prenom_enfant = 'Léa';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T7 mes_effacements'; END IF;
  RAISE NOTICE 'OK T7 mes_effacements : « Léa » en attente (pour pouvoir annuler)';

  BEGIN
    PERFORM public.demander_effacement_enfant(current_setting('test.lea')::uuid);
    RAISE EXCEPTION 'ÉCHEC T8 double demande';
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN RAISE NOTICE 'OK T8 pas de seconde demande pour le même enfant';
  END;

  BEGIN
    PERFORM public.executer_effacement(gen_random_uuid());
    RAISE EXCEPTION 'ÉCHEC T9 un parent exécute un effacement';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T9 fonctions d''exécution refusées à un compte (service seulement)';
  END;
  BEGIN
    PERFORM public.effacements_dus();
    RAISE EXCEPTION 'ÉCHEC T9b effacements_dus lisible';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT statut FROM public.invitations_responsable WHERE id = current_setting('test.inv_lea')::uuid) <> 'annulee' THEN
    RAISE EXCEPTION 'ÉCHEC T10 invitation pour Léa encore en attente';
  END IF;
  RAISE NOTICE 'OK T10 invitation en attente pour Léa annulée (personne ne rejoint un carnet qui va être effacé)';
END $$;

-- ─── C ne peut pas annuler la demande de A ───────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.demandes_effacement;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T11 C lit les demandes de A'; END IF;
  BEGIN
    PERFORM public.annuler_effacement((SELECT demande_id FROM public.effacements_dus() LIMIT 1));
    RAISE EXCEPTION 'ÉCHEC T11b';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T11 un autre compte ne voit ni n''annule la demande';
END $$;
RESET ROLE;
DO $$
DECLARE v uuid;
BEGIN
  SELECT id INTO v FROM public.demandes_effacement WHERE child_id = current_setting('test.lea')::uuid;
  PERFORM set_config('test.dem_lea', v::text, true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.annuler_effacement(current_setting('test.dem_lea')::uuid);
  RAISE EXCEPTION 'ÉCHEC T11c C annule la demande de A';
EXCEPTION WHEN no_data_found THEN RAISE NOTICE 'OK T11c annulation par un autre compte : demande introuvable';
END $$;
RESET ROLE;

-- ─── A annule : Léa revient ; puis redemande ─────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  PERFORM public.annuler_effacement(current_setting('test.dem_lea')::uuid);
  SELECT count(*) INTO n FROM public.carnet_items WHERE child_id = current_setting('test.lea')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T12 carnet de Léa pas revenu après annulation'; END IF;
  RAISE NOTICE 'OK T12 annulation : Léa et son carnet reviennent intacts';
  PERFORM public.demander_effacement_enfant(current_setting('test.lea')::uuid);
  RAISE NOTICE 'OK T12b nouvelle demande possible après annulation';
END $$;
RESET ROLE;

-- ─── B demande l'effacement de son compte ────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int; r record;
BEGIN
  SELECT count(*) INTO n FROM public.apercu_effacement_compte() WHERE NOT carnet_efface;
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T13 aperçu : % carnet(s) gardé(s) (attendu 2 : Emma, Tom)', n; END IF;
  RAISE NOTICE 'OK T13 aperçu : Emma et Tom gardés (autre responsable), aucun carnet effacé';
  PERFORM public.demander_effacement_compte();
  SELECT count(*) INTO n FROM public.children;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T14 B voit encore % carnet(s)', n; END IF;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'carnet';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T14b B relit % fichier(s)', n; END IF;
  SELECT count(*) INTO n FROM public.mes_effacements() WHERE portee = 'compte';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T14c'; END IF;
  RAISE NOTICE 'OK T14 compte B désactivé dès la demande : plus aucun carnet ni fichier (annulation possible)';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.carnet_items WHERE child_id = current_setting('test.emma')::uuid;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T15 A voit % ajout(s) de B (attendu 1 : le « foyer », pas le privé)', n; END IF;
  SELECT count(*) INTO n FROM storage.objects WHERE name = current_setting('test.f_emma_b');
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T15b A ne lit plus le fichier « foyer » de B'; END IF;
  SELECT count(*) INTO n FROM storage.objects WHERE name = current_setting('test.f_emma_b_prive');
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T15d A lit le fichier privé de B'; END IF;
  SELECT count(*) INTO n FROM public.children WHERE id IN (current_setting('test.emma')::uuid, current_setting('test.tom')::uuid);
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T15c A ne voit plus Emma / Tom'; END IF;
  RAISE NOTICE 'OK T15 pendant les 30 jours : l''ajout « foyer » de B reste visible pour A (il sera conservé), pas son privé ; A garde Emma et Tom';
END $$;
RESET ROLE;

-- ─── Exécution (service_role) ────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', true) \gset
SET LOCAL ROLE service_role;
DO $$
DECLARE n int; v_lea uuid; v_b uuid;
BEGIN
  SELECT count(*) INTO n FROM public.effacements_dus();
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T16 demandes échues avant 30 jours'; END IF;
  SELECT id INTO v_lea FROM public.demandes_effacement WHERE child_id = current_setting('test.lea')::uuid AND annulee_le IS NULL;
  BEGIN
    PERFORM public.executer_effacement(v_lea);
    RAISE EXCEPTION 'ÉCHEC T16b exécution avant le délai';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK T16 rien d''exécutable avant 30 jours';
  PERFORM set_config('test.dem_lea2', v_lea::text, true);
END $$;
RESET ROLE;
-- On avance l'horloge : les deux demandes deviennent échues.
UPDATE public.demandes_effacement SET execution_prevue_le = now() - interval '1 minute' WHERE annulee_le IS NULL;

SET LOCAL ROLE service_role;
DO $$
DECLARE n int; v_b uuid; f text[];
BEGIN
  SELECT count(*) INTO n FROM public.effacements_dus();
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T17 % demande(s) échue(s) (attendu 2)', n; END IF;
  SELECT array_agg(x) INTO f FROM public.fichiers_a_effacer(current_setting('test.dem_lea2')::uuid) x;
  IF f IS NULL OR NOT (current_setting('test.f_lea') = ANY (f)) OR current_setting('test.f_emma_b') = ANY (f) THEN
    RAISE EXCEPTION 'ÉCHEC T17b fichiers Léa : %', f;
  END IF;
  SELECT demande_id INTO v_b FROM public.effacements_dus() WHERE portee = 'compte';
  PERFORM set_config('test.dem_b', v_b::text, true);
  SELECT array_agg(x) INTO f FROM public.fichiers_a_effacer(v_b) x;
  IF f IS NULL OR NOT (current_setting('test.f_emma_b_prive') = ANY (f)) OR current_setting('test.f_emma_b') = ANY (f)
     OR current_setting('test.f_lea') = ANY (f) THEN
    RAISE EXCEPTION 'ÉCHEC T17c fichiers compte B : %', f;
  END IF;
  RAISE NOTICE 'OK T17 fichiers à supprimer : dossier de Léa ; fichier PRIVÉ de B (son fichier « foyer » est gardé)';

  PERFORM public.executer_effacement(current_setting('test.dem_lea2')::uuid);
  SELECT count(*) INTO n FROM public.children WHERE id = current_setting('test.lea')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T18 Léa existe encore'; END IF;
  SELECT count(*) INTO n FROM public.alertes_urgence WHERE auteur_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T18b alerte liée à Léa conservée'; END IF;
  SELECT count(*) INTO n FROM public.academic_years WHERE student_id = current_setting('test.lea')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T18c années de Léa conservées'; END IF;
  SELECT count(*) INTO n FROM public.demandes_effacement WHERE id = current_setting('test.dem_lea2')::uuid AND executee_le IS NOT NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T18d demande non marquée exécutée'; END IF;
  RAISE NOTICE 'OK T18 Léa effacée (carnet, années, alerte) ; registre : demande exécutée, sans nom';

  PERFORM public.executer_effacement(v_b);
  SELECT count(*) INTO n FROM public.responsables WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T19 B encore responsable'; END IF;
  IF (SELECT parent_id FROM public.children WHERE id = current_setting('test.tom')::uuid) <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' THEN
    RAISE EXCEPTION 'ÉCHEC T19b Tom pas rattaché à A (créateur supprimé = Tom effacé en cascade)';
  END IF;
  RAISE NOTICE 'OK T19 compte B : retiré des responsables, Tom (créé par B) rattaché à A';
END $$;
RESET ROLE;

-- Suppression du compte Auth (ce que fait l'Edge Function), puis marquage.
DELETE FROM auth.users WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SET LOCAL ROLE service_role;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.children WHERE id IN (current_setting('test.emma')::uuid, current_setting('test.tom')::uuid);
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T20 Emma / Tom perdus avec le compte B (% restant)', n; END IF;
  SELECT count(*) INTO n FROM public.carnet_items WHERE ajoute_par = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T20b un ajout porte encore l''identifiant de B'; END IF;
  SELECT count(*) INTO n FROM public.carnet_items WHERE titre = 'Photo par Marc' AND ajoute_par IS NULL AND fichier = current_setting('test.f_emma_b');
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T20d ajout « foyer » de B non conservé (sans auteur)'; END IF;
  SELECT count(*) INTO n FROM public.carnet_items WHERE titre = 'Note privée de Marc';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T20e ajout privé de B conservé'; END IF;
  SELECT count(*) INTO n FROM storage.objects WHERE name = current_setting('test.f_emma_b') AND owner_id IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T20f fichier « foyer » perdu, ou propriétaire encore renseigné'; END IF;
  RAISE NOTICE 'OK T20a ajouts : « foyer » conservé sans auteur (fichier gardé, sans propriétaire), privé supprimé';

  SELECT count(*) INTO n FROM public.signatures
  WHERE mot_id = current_setting('test.mot')::uuid AND parent_id IS NULL AND parent_name = 'Responsable (compte supprimé)'
    AND signed_at = current_setting('test.signe_le')::timestamptz;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T20g signature de B non conservée / non anonymisée'; END IF;
  IF NOT (SELECT est_signe FROM public.mot_carnets_statut WHERE mot_id = current_setting('test.mot')::uuid) THEN
    RAISE EXCEPTION 'ÉCHEC T20h le mot repasse « à signer »';
  END IF;
  RAISE NOTICE 'OK T20b signature conservée : « Responsable (compte supprimé) », même date ; le mot reste signé';

  SELECT count(*) INTO n FROM public.teacher_messages WHERE conversation_id = current_setting('test.fil_foyer')::uuid AND sender_id IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T20i message du fil famille non conservé sans auteur'; END IF;
  SELECT count(*) INTO n FROM public.teacher_conversations WHERE id = current_setting('test.fil_indiv')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T20j fil individuel de B conservé'; END IF;
  RAISE NOTICE 'OK T20c fil famille : message conservé sans auteur ; fil individuel de B supprimé';
  PERFORM public.marquer_effacement_execute(current_setting('test.dem_b')::uuid);
  SELECT count(*) INTO n FROM public.effacements_dus();
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T20c demande encore due'; END IF;
  RAISE NOTICE 'OK T20 compte B supprimé : Emma et Tom intacts pour A, demande close';

  SELECT count(*) INTO n FROM public.fichiers_orphelins() x WHERE x = current_setting('test.f_orphelin');
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T21 orphelin ancien non listé'; END IF;
  SELECT count(*) INTO n FROM public.fichiers_orphelins() x WHERE x = current_setting('test.f_emma_b');
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T21b (fichier récent listé comme orphelin)'; END IF;
  RAISE NOTICE 'OK T21 fichiers orphelins : seulement ceux sans ligne et de plus d''un jour';
END $$;
RESET ROLE;

-- ─── Départ d'un responsable : ses ajouts privés partent, ses ajouts « foyer » restent ───
-- C rejoint Emma, ajoute un élément privé et un élément foyer, puis se retire.
INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', child_id, 'parent' FROM public.responsables WHERE child_id = :'emma';
INSERT INTO public.carnet_items (child_id, categorie, titre, ajoute_par, visibilite) VALUES
  (:'emma', 'jalon', 'Note privée de C', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'prive'),
  (:'emma', 'jalon', 'Jalon partagé par C', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'foyer');
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DELETE FROM public.responsables WHERE user_id = auth.uid() AND child_id = :'emma';
RESET ROLE;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.carnet_items WHERE ajoute_par = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' AND visibilite = 'prive';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T22 ajout privé de C conservé après son départ'; END IF;
  SELECT count(*) INTO n FROM public.carnet_items WHERE ajoute_par = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' AND visibilite = 'foyer';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T22b ajout foyer de C perdu'; END IF;
  RAISE NOTICE 'OK T22 départ d''un responsable : ses ajouts privés supprimés, ses ajouts « foyer » restent au carnet';
END $$;

ROLLBACK;
