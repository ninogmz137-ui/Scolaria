-- PREUVE 2 de la validation de M30 : A1 à A3 (compte_en_effacement, enfant_en_effacement, est_titulaire_enfant).
-- Compare, pour chaque appelant et chaque état, la définition ACTUELLE de Paris (avant M30, recopiée ci-dessous sous le
-- suffixe _ancienne) et celle de M30 : identiques pour un appelant autorisé, fermées pour les autres ; puis compare ce que
-- VOIENT un enseignant, un parent et un étranger dans les tables du carnet avec les anciennes et les nouvelles fonctions.
-- Base LOCALE, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m30_preuve2_appelants.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- Définitions de Paris AVANT M30 (lues sur Paris le 4 oct 2026), sous un autre nom.
CREATE FUNCTION public.compte_en_effacement_ancienne(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $a$
  SELECT EXISTS (SELECT 1 FROM public.demandes_effacement d WHERE d.portee = 'compte' AND d.user_id = p_user_id AND d.annulee_le IS NULL AND d.executee_le IS NULL);
$a$;
CREATE FUNCTION public.enfant_en_effacement_ancienne(p_child_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $a$
  SELECT EXISTS (SELECT 1 FROM public.demandes_effacement d WHERE d.portee = 'enfant' AND d.child_id = p_child_id AND d.annulee_le IS NULL AND d.executee_le IS NULL);
$a$;
CREATE FUNCTION public.est_titulaire_enfant_ancienne(p_child_id uuid, p_teacher_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $a$
  SELECT EXISTS (SELECT 1 FROM public.academic_years ay JOIN public.classes c ON c.id = ay.classe_id
                 WHERE ay.student_id = p_child_id AND ay.statut = 'active' AND c.enseignant_id = p_teacher_id);
$a$;
GRANT EXECUTE ON FUNCTION public.compte_en_effacement_ancienne(uuid), public.enfant_en_effacement_ancienne(uuid), public.est_titulaire_enfant_ancienne(uuid, uuid) TO authenticated;

-- Acteurs : A (parent d'Emma), B (parent d'un AUTRE foyer), TE (titulaire de la classe d'Emma), TX (autre enseignant).
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'te@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'tx@test.local', 'authenticated', 'authenticated', '{}', now());
UPDATE public.profiles SET role = 'enseignant' WHERE id IN ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'ffffffff-ffff-4fff-8fff-ffffffffffff');

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS emma FROM public.create_child('Emma', 'Moreau', NULL, 9, 'CM1', 'École test') \gset
RESET ROLE;
SELECT set_config('test.emma', :'emma', true) \gset
INSERT INTO public.ecoles (nom) VALUES ('École preuve 2') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  SELECT :'ecole', annee_scolaire, 'CM1', 'CM1 preuve', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' FROM public.academic_years WHERE student_id = :'emma' RETURNING id AS classe \gset
UPDATE public.academic_years SET classe_id = :'classe' WHERE student_id = :'emma';
-- Contenu visible côté enseignant et parent : un mot envoyé à la classe, une signature, un fil individuel.
INSERT INTO public.mots_liaison (teacher_id, classe, classe_id, type, titre, contenu, statut, signature_mode)
  VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'CM1 preuve', :'classe', 'signature', 'Sortie', 'texte', 'envoyé', 'one') RETURNING id AS mot \gset
INSERT INTO public.signatures (mot_id, student_id, parent_id) VALUES (:'mot', :'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, parent_id, parent_name)
  VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', :'emma', 'individuel', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Claire') RETURNING id AS fil \gset
INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text) VALUES (:'fil', 'parent', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bonjour');

-- Résultats : appelant × état × fonction → ancienne / nouvelle réponse.
CREATE TEMP TABLE res (appelant text, etat text, fonction text, ancienne boolean, nouvelle boolean) ON COMMIT DROP;
GRANT ALL ON res TO PUBLIC;
CREATE TEMP TABLE vu (appelant text, etat text, table_ text, defs text, n int) ON COMMIT DROP;
GRANT ALL ON vu TO PUBLIC;

CREATE FUNCTION pg_temp.mesurer(p_appelant text, p_uid uuid, p_etat text) RETURNS void LANGUAGE plpgsql AS $m$
DECLARE c uuid := current_setting('test.emma')::uuid;
BEGIN
  INSERT INTO res VALUES
    (p_appelant, p_etat, 'compte_en_effacement(A)', public.compte_en_effacement_ancienne('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), public.compte_en_effacement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),
    (p_appelant, p_etat, 'compte_en_effacement(soi)', public.compte_en_effacement_ancienne(p_uid), public.compte_en_effacement(p_uid)),
    (p_appelant, p_etat, 'enfant_en_effacement(Emma)', public.enfant_en_effacement_ancienne(c), public.enfant_en_effacement(c)),
    (p_appelant, p_etat, 'est_titulaire_enfant(Emma, TE)', public.est_titulaire_enfant_ancienne(c, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'), public.est_titulaire_enfant(c, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')),
    (p_appelant, p_etat, 'est_titulaire_enfant(Emma, soi)', public.est_titulaire_enfant_ancienne(c, p_uid), public.est_titulaire_enfant(c, p_uid));
END $m$;
GRANT EXECUTE ON FUNCTION pg_temp.mesurer(text, uuid, text) TO PUBLIC;

-- Ce que VOIT l'appelant (comptes de lignes), avec les fonctions de l'instant (« defs » = ancienne ou nouvelle).
CREATE FUNCTION pg_temp.voir(p_appelant text, p_etat text, p_defs text) RETURNS void LANGUAGE plpgsql AS $v$
BEGIN
  INSERT INTO vu VALUES
    (p_appelant, p_etat, 'children', p_defs, (SELECT count(*) FROM public.children)),
    (p_appelant, p_etat, 'academic_years', p_defs, (SELECT count(*) FROM public.academic_years)),
    (p_appelant, p_etat, 'mots_liaison', p_defs, (SELECT count(*) FROM public.mots_liaison)),
    (p_appelant, p_etat, 'mot_carnets', p_defs, (SELECT count(*) FROM public.mot_carnets)),
    (p_appelant, p_etat, 'signatures', p_defs, (SELECT count(*) FROM public.signatures)),
    (p_appelant, p_etat, 'teacher_conversations', p_defs, (SELECT count(*) FROM public.teacher_conversations)),
    (p_appelant, p_etat, 'teacher_messages', p_defs, (SELECT count(*) FROM public.teacher_messages)),
    (p_appelant, p_etat, 'competences', p_defs, (SELECT count(*) FROM public.competences)),
    (p_appelant, p_etat, 'carnet_items', p_defs, (SELECT count(*) FROM public.carnet_items)),
    (p_appelant, p_etat, 'agenda_events', p_defs, (SELECT count(*) FROM public.agenda_events)),
    (p_appelant, p_etat, 'responsables', p_defs, (SELECT count(*) FROM public.responsables));
END $v$;
GRANT EXECUTE ON FUNCTION pg_temp.voir(text, text, text) TO PUBLIC;

-- Mesures pour un état donné : 4 appelants.
CREATE PROCEDURE pg_temp.balayer(p_etat text, p_defs text) LANGUAGE plpgsql AS $b$
DECLARE a record;
BEGIN
  FOR a IN SELECT * FROM (VALUES ('A parent', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid), ('B autre foyer', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid),
                                 ('TE titulaire', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid), ('TX autre prof', 'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid)) v(nom, uid) LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', a.uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    IF p_defs = 'nouvelle' THEN PERFORM pg_temp.mesurer(a.nom, a.uid, p_etat); END IF;
    PERFORM pg_temp.voir(a.nom, p_etat, p_defs);
    RESET ROLE;
  END LOOP;
END $b$;

-- Trois états : rien ; effacement de l'ENFANT demandé par A ; effacement du COMPTE de A demandé.
CALL pg_temp.balayer('1 rien', 'nouvelle');

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT public.demander_effacement_enfant(:'emma');
RESET ROLE;
CALL pg_temp.balayer('2 enfant en effacement', 'nouvelle');

-- Les MÊMES lectures avec les ANCIENNES définitions (remplacement dans la transaction annulée).
CREATE OR REPLACE FUNCTION public.compte_en_effacement(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $a$
  SELECT EXISTS (SELECT 1 FROM public.demandes_effacement d WHERE d.portee = 'compte' AND d.user_id = p_user_id AND d.annulee_le IS NULL AND d.executee_le IS NULL);
$a$;
CREATE OR REPLACE FUNCTION public.enfant_en_effacement(p_child_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $a$
  SELECT EXISTS (SELECT 1 FROM public.demandes_effacement d WHERE d.portee = 'enfant' AND d.child_id = p_child_id AND d.annulee_le IS NULL AND d.executee_le IS NULL);
$a$;
CREATE OR REPLACE FUNCTION public.est_titulaire_enfant(p_child_id uuid, p_teacher_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $a$
  SELECT EXISTS (SELECT 1 FROM public.academic_years ay JOIN public.classes c ON c.id = ay.classe_id
                 WHERE ay.student_id = p_child_id AND ay.statut = 'active' AND c.enseignant_id = p_teacher_id);
$a$;
CALL pg_temp.balayer('2 enfant en effacement', 'ancienne');

-- ─── Verdicts ───────────────────────────────────────────────────────────────
-- V1 : ce que chaque appelant VOIT est IDENTIQUE avec les anciennes et les nouvelles fonctions, dans les 2 états
--      (parent, étranger, enseignant titulaire, autre enseignant ; 11 tables).
DO $$
DECLARE d record; n int := 0;
BEGIN
  FOR d IN SELECT n1.appelant, n1.etat, n1.table_, n1.n AS nouveau, a1.n AS ancien
           FROM vu n1 JOIN vu a1 ON a1.appelant = n1.appelant AND a1.etat = n1.etat AND a1.table_ = n1.table_ AND a1.defs = 'ancienne'
           WHERE n1.defs = 'nouvelle' AND n1.etat = '2 enfant en effacement' LOOP
    IF d.nouveau <> d.ancien THEN RAISE EXCEPTION 'ÉCHEC V1 % / % / % : ancien % ≠ nouveau %', d.appelant, d.etat, d.table_, d.ancien, d.nouveau; END IF;
    n := n + 1;
  END LOOP;
  IF n <> 44 THEN RAISE EXCEPTION 'ÉCHEC V1 % comparaisons au lieu de 44', n; END IF;
  RAISE NOTICE 'OK V1 ce que voient A, B, TE et TX est IDENTIQUE avec les anciennes et les nouvelles fonctions (44 comparaisons, enfant en cours d''effacement)';
END $$;

-- V2 : appelant AUTORISÉ → réponse inchangée ; appelant NON autorisé → fermé (faux).
DO $$
DECLARE d record; n_ok int := 0; n_ferme int := 0;
BEGIN
  FOR d IN SELECT * FROM res LOOP
    IF (d.fonction = 'compte_en_effacement(soi)')
       OR (d.fonction = 'compte_en_effacement(A)' AND d.appelant = 'A parent')
       OR (d.fonction = 'enfant_en_effacement(Emma)' AND d.appelant = 'A parent')
       OR (d.fonction = 'est_titulaire_enfant(Emma, TE)' AND d.appelant IN ('A parent', 'TE titulaire'))
       OR (d.fonction = 'est_titulaire_enfant(Emma, soi)' AND d.appelant IN ('TE titulaire', 'TX autre prof')) THEN
      IF d.ancienne IS DISTINCT FROM d.nouvelle THEN
        RAISE EXCEPTION 'ÉCHEC V2 appelant autorisé % / % / % : ancienne % ≠ nouvelle %', d.appelant, d.etat, d.fonction, d.ancienne, d.nouvelle;
      END IF;
      n_ok := n_ok + 1;
    ELSE
      IF d.nouvelle IS TRUE THEN RAISE EXCEPTION 'ÉCHEC V2 appelant NON autorisé % / % / % obtient VRAI', d.appelant, d.etat, d.fonction; END IF;
      n_ferme := n_ferme + 1;
    END IF;
  END LOOP;
  IF n_ok < 20 OR n_ferme < 10 THEN RAISE EXCEPTION 'ÉCHEC V2 couverture : % autorisés, % fermés', n_ok, n_ferme; END IF;
  RAISE NOTICE 'OK V2 appelant autorisé : réponse inchangée (% cas) ; appelant non autorisé : fermé (% cas)', n_ok, n_ferme;
END $$;

-- V3 : l'enseignant titulaire VOIT-IL l'enfant en cours d'effacement ? (constat, identique avant et après M30)
DO $$
DECLARE r text;
BEGIN
  SELECT string_agg(table_ || '=' || n, ', ' ORDER BY table_) INTO r FROM vu WHERE appelant = 'TE titulaire' AND etat = '2 enfant en effacement' AND defs = 'nouvelle' AND n > 0;
  RAISE NOTICE 'CONSTAT V3 enseignant titulaire, enfant en cours d''effacement, visible : %', r;
  SELECT string_agg(table_ || '=' || n, ', ' ORDER BY table_) INTO r FROM vu WHERE appelant = 'A parent' AND etat = '2 enfant en effacement' AND defs = 'nouvelle' AND n > 0;
  RAISE NOTICE 'CONSTAT V3 parent A, enfant en cours d''effacement, visible : %', r;
  SELECT string_agg(table_ || '=' || n, ', ' ORDER BY table_) INTO r FROM vu WHERE appelant = 'B autre foyer' AND etat = '2 enfant en effacement' AND defs = 'nouvelle' AND n > 0;
  RAISE NOTICE 'CONSTAT V3 parent d''un autre foyer, visible : %', coalesce(r, '(rien)');
END $$;

ROLLBACK;
\echo 'PREUVE 2 : verdicts V1 et V2 OK, constat V3 ci-dessus (transaction annulée)'
