-- Tests M27 · suppression d'un compte : réponses aux mots et événements d'agenda conservés sans auteur.
-- À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m27_reponses_agenda_conserves.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}', now());

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS emma FROM public.create_child('Emma', 'Moreau', NULL, 12, '5e', 'Collège test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset

INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', child_id, 'parent' FROM public.responsables WHERE child_id = :'emma';
SELECT id AS ay FROM public.academic_years WHERE student_id = :'emma' \gset

-- Deux mots d'autorisation : l'un ouvert, l'autre clos ; B répond aux deux ; A répond au premier.
INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, signature_mode) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'autorisation', 'Sortie ouverte', 'x', 'envoyé', 'one') RETURNING id AS mot_ouvert \gset
INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut, signature_mode) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'autorisation', 'Sortie passée', 'x', 'envoyé', 'none') RETURNING id AS mot_clos \gset
INSERT INTO public.mot_carnets (mot_id, child_id, academic_year_id) VALUES (:'mot_ouvert', :'emma', :'ay'), (:'mot_clos', :'emma', :'ay');
INSERT INTO public.reponses_mot (mot_id, child_id, responsable_id, autorisation) VALUES
  (:'mot_ouvert', :'emma', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true),
  (:'mot_clos', :'emma', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false),
  (:'mot_ouvert', :'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
UPDATE public.mots_liaison SET statut = 'clos' WHERE id = :'mot_clos';
-- Événements d'agenda : un par B, un par A.
INSERT INTO public.agenda_events (child_id, parent_id, title, event_type, start_time) VALUES
  (:'emma', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Rendez-vous orthodontiste', 'reunion', now() + interval '3 days'),
  (:'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Match de foot', 'activite', now() + interval '4 days');
SELECT set_config('test.emma', :'emma', true), set_config('test.mot_ouvert', :'mot_ouvert', true), set_config('test.mot_clos', :'mot_clos', true) \gset

-- ─── Avant suppression : l'autre responsable lit les réponses de B et son événement ───
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.reponses_mot WHERE child_id = current_setting('test.emma')::uuid;
  IF n <> 3 THEN RAISE EXCEPTION 'ÉCHEC T1 A voit % réponse(s) (attendu 3)', n; END IF;
  SELECT count(*) INTO n FROM public.agenda_events WHERE child_id = current_setting('test.emma')::uuid;
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T1b A voit % événement(s) (attendu 2)', n; END IF;
  RAISE NOTICE 'OK T1 avant suppression : A lit les réponses et les événements de B (rien n''est privé)';
END $$;
RESET ROLE;

-- ─── Suppression du compte de B (ce que fait l'Edge Function après executer_effacement) ───
DELETE FROM public.responsables WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DELETE FROM auth.users WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.reponses_mot WHERE responsable_id IS NULL AND child_id = current_setting('test.emma')::uuid;
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T2 % réponse(s) anonymisée(s) (attendu 2, dont celle du mot CLOS)', n; END IF;
  SELECT count(*) INTO n FROM public.reponses_mot WHERE responsable_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T2b réponse de A touchée'; END IF;
  IF (SELECT autorisation FROM public.reponses_mot WHERE mot_id = current_setting('test.mot_clos')::uuid) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'ÉCHEC T2c valeur de la réponse modifiée';
  END IF;
  RAISE NOTICE 'OK T2 réponses de B conservées sans auteur, valeurs intactes (y compris sur un mot clos) ; celle de A intacte';
  SELECT count(*) INTO n FROM public.agenda_events WHERE parent_id IS NULL AND title = 'Rendez-vous orthodontiste';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T3 événement de B non conservé'; END IF;
  SELECT count(*) INTO n FROM public.agenda_events WHERE parent_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T3b événement de A touché'; END IF;
  RAISE NOTICE 'OK T3 événement d''agenda de B conservé sans auteur ; celui de A intact';
END $$;

-- ─── A (resté responsable) voit et peut utiliser les lignes orphelines, sans pouvoir les réattribuer ───
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.reponses_mot WHERE responsable_id IS NULL AND child_id = current_setting('test.emma')::uuid;
  IF n <> 2 THEN RAISE EXCEPTION 'ÉCHEC T4 A ne lit pas les réponses conservées'; END IF;
  SELECT count(*) INTO n FROM public.agenda_events WHERE parent_id IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T4b A ne lit pas l''événement conservé'; END IF;
  RAISE NOTICE 'OK T4 A lit les réponses et l''événement conservés';
  -- A ne peut pas se les attribuer (la mise à jour exige responsable_id = soi : une ligne NULL est inaccessible)
  UPDATE public.reponses_mot SET responsable_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' WHERE responsable_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T5 A s''attribue une réponse conservée'; END IF;
  RAISE NOTICE 'OK T5 une réponse conservée ne peut pas être réattribuée';
  -- A peut modifier / supprimer l'événement conservé (agenda partagé : règle de l'agenda inchangée)
  UPDATE public.agenda_events SET title = 'Orthodontiste (déplacé)' WHERE parent_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T6 A ne peut plus modifier l''événement conservé'; END IF;
  RAISE NOTICE 'OK T6 A peut modifier un événement conservé (agenda partagé)';
  -- Falsification : changer l'auteur d'une réponse reste interdit
  BEGIN
    UPDATE public.reponses_mot SET responsable_id = NULL WHERE responsable_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'ÉCHEC T7 A anonymise sa propre réponse à la main';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  WHEN others THEN
    IF SQLERRM LIKE 'ÉCHEC%' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'OK T7 anonymisation à la main refusée à un compte (seule la suppression de compte le fait)';
END $$;
RESET ROLE;

ROLLBACK;
