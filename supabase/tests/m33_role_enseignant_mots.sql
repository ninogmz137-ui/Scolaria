-- Tests M33 · un mot (brouillon compris) n'est créable que par profiles.role = 'enseignant'. Base LOCALE, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m33_role_enseignant_mots.sql
-- A : parent ; TE : enseignant (rôle posé par le serveur) titulaire d'une classe ; TP : compte « parent » titulaire d'une classe
-- (cas tordu : le rôle fait foi, pas la classe).

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}', now()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'te@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'tp@test.local', 'authenticated', 'authenticated', '{}', now());
-- A demande « enseignant » dans ses métadonnées (modifiables) : sans effet. Seul le serveur pose le rôle de TE.
UPDATE public.profiles SET role = 'enseignant' WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
INSERT INTO public.ecoles (nom) VALUES ('École M33') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CM1', 'CM1 de TE', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') RETURNING id AS classe_te \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id) VALUES
  (:'ecole', '2026-2027', 'CM2', 'CM2 de TP', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') RETURNING id AS classe_tp \gset
SELECT set_config('test.classe_te', :'classe_te', true), set_config('test.classe_tp', :'classe_tp', true) \gset

-- T1 : le parent A (métadonnées « enseignant ») ne crée PAS de brouillon sans classe.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.est_enseignant() THEN RAISE EXCEPTION 'ÉCHEC T1 est_enseignant() vrai pour un parent'; END IF;
  BEGIN
    INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'information', 'brouillon', 'x', 'brouillon');
    RAISE EXCEPTION 'ÉCHEC T1 un parent crée un brouillon sans classe';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T1 parent : brouillon sans classe refusé (même avec « enseignant » dans ses métadonnées)';
END $$;
RESET ROLE;

-- T2 : l'enseignant TE crée un brouillon sans classe, un mot pour SA classe, et modifie son brouillon.
SELECT set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","email":"te@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE m uuid;
BEGIN
  IF NOT public.est_enseignant() THEN RAISE EXCEPTION 'ÉCHEC T2 est_enseignant() faux pour l''enseignant'; END IF;
  INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'information', 'brouillon prof', 'x', 'brouillon') RETURNING id INTO m;
  UPDATE public.mots_liaison SET titre = 'brouillon prof (modifié)' WHERE id = m;
  IF (SELECT titre FROM public.mots_liaison WHERE id = m) <> 'brouillon prof (modifié)' THEN RAISE EXCEPTION 'ÉCHEC T2 bis modification du brouillon'; END IF;
  INSERT INTO public.mots_liaison (teacher_id, classe_id, classe, type, titre, contenu, statut) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', current_setting('test.classe_te')::uuid, 'CM1 de TE', 'information', 'mot de classe', 'x', 'brouillon');
  -- Classe d'un AUTRE : toujours refusé (M30).
  BEGIN
    INSERT INTO public.mots_liaison (teacher_id, classe_id, classe, type, titre, contenu, statut) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', current_setting('test.classe_tp')::uuid, 'CM2 de TP', 'information', 'intrus', 'x', 'brouillon');
    RAISE EXCEPTION 'ÉCHEC T2 ter mot dans la classe d''un autre';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- Il ne peut pas rattacher son brouillon à la classe d'un autre en le modifiant.
  BEGIN
    UPDATE public.mots_liaison SET classe_id = current_setting('test.classe_tp')::uuid WHERE id = m;
    IF FOUND THEN RAISE EXCEPTION 'ÉCHEC T2 quater rattachement à la classe d''un autre'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T2 enseignant : brouillon, modification et mot de classe acceptés ; classe d''un autre refusée';
END $$;
RESET ROLE;

-- T3 : TP (rôle « parent », titulaire d'une classe créée par le serveur) : le rôle fait foi, refusé même pour SA classe.
SELECT set_config('request.jwt.claims', '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","email":"tp@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.mots_liaison (teacher_id, classe_id, classe, type, titre, contenu, statut) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', current_setting('test.classe_tp')::uuid, 'CM2 de TP', 'information', 'mot', 'x', 'brouillon');
    RAISE EXCEPTION 'ÉCHEC T3 un compte « parent » écrit dans sa classe';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.mots_liaison (teacher_id, type, titre, contenu, statut) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'information', 'brouillon', 'x', 'brouillon');
    RAISE EXCEPTION 'ÉCHEC T3 bis un compte « parent » crée un brouillon';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T3 le rôle de profiles fait foi (titulaire de classe sans rôle : refusé)';
END $$;
RESET ROLE;

-- T4 : personne ne peut s'attribuer le rôle (verrou existant) ; l'anonyme n'appelle pas est_enseignant().
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN UPDATE public.profiles SET role = 'enseignant' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; RAISE EXCEPTION 'ÉCHEC T4 auto-attribution du rôle';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'OK T4 auto-attribution du rôle refusée';
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN PERFORM public.est_enseignant(); RAISE EXCEPTION 'ÉCHEC T4 bis anonyme appelle est_enseignant()';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

ROLLBACK;
\echo 'M33 : 4 groupes de tests OK (transaction annulée)'
