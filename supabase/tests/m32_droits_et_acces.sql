-- Tests M32 · droits de table et accès. À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m32_droits_et_acces.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- ─── Catalogue : droits effectifs ───────────────────────────────────────────
DO $$
DECLARE n int; liste text;
BEGIN
  -- T1 : anon n'a AUCUN droit sur une table, vue ou séquence de public.
  SELECT count(*), string_agg(DISTINCT table_name, ',') INTO n, liste
    FROM information_schema.role_table_grants WHERE table_schema = 'public' AND grantee = 'anon';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T1 anon a des droits de table : %', liste; END IF;
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
    WHERE s.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p', 'S')
      AND (has_table_privilege('anon', c.oid, 'SELECT') OR has_table_privilege('anon', c.oid, 'INSERT')
        OR has_table_privilege('anon', c.oid, 'UPDATE') OR has_table_privilege('anon', c.oid, 'DELETE')
        OR has_table_privilege('anon', c.oid, 'TRUNCATE')) AND c.relkind <> 'S';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T1 bis anon peut encore agir sur % objet(s)', n; END IF;
  -- T2 : authenticated n'a plus TRUNCATE / TRIGGER / REFERENCES nulle part.
  SELECT count(*), string_agg(DISTINCT table_name || ':' || privilege_type, ',') INTO n, liste
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'authenticated' AND privilege_type IN ('TRUNCATE', 'TRIGGER', 'REFERENCES');
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T2 authenticated garde des droits dangereux : %', liste; END IF;
  -- T3 : authenticated garde SELECT sur les tables utilisées (la RLS décide).
  IF NOT has_table_privilege('authenticated', 'public.children', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.carnet_items', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.agenda_events', 'UPDATE') THEN
    RAISE EXCEPTION 'ÉCHEC T3 authenticated a perdu un droit nécessaire';
  END IF;
  -- T4 : tables inutilisées : plus aucun droit pour anon ni authenticated.
  SELECT count(*), string_agg(DISTINCT table_name, ',') INTO n, liste
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
      AND table_name IN ('messages', 'deletion_requests', 'export_history', 'transfer_codes', 'access_journal', 'person_permissions');
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T4 accès non coupé : %', liste; END IF;
  -- Les données et la RLS de ces tables sont conservées (pas de suppression).
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
        WHERE s.nspname = 'public' AND c.relname IN ('messages', 'deletion_requests', 'export_history', 'transfer_codes', 'access_journal', 'person_permissions')
          AND c.relrowsecurity) <> 6 THEN
    RAISE EXCEPTION 'ÉCHEC T4 bis une table inutilisée a perdu sa RLS ou a disparu';
  END IF;
  -- T5 : le service garde tout.
  IF NOT has_table_privilege('service_role', 'public.messages', 'SELECT') OR NOT has_table_privilege('service_role', 'public.children', 'DELETE') THEN
    RAISE EXCEPTION 'ÉCHEC T5 service_role a perdu un droit';
  END IF;
END $$;

-- T6 : une table créée plus tard ne donne rien à anon (droits par défaut).
CREATE TABLE public.zz_futur (id int);
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.zz_futur', 'SELECT') THEN RAISE EXCEPTION 'ÉCHEC T6 table future lisible par anon'; END IF;
  IF has_table_privilege('authenticated', 'public.zz_futur', 'TRUNCATE') THEN RAISE EXCEPTION 'ÉCHEC T6 bis TRUNCATE accordé par défaut'; END IF;
END $$;
DROP TABLE public.zz_futur;

-- ─── Données de test ────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{"first_name":"Claire"}', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}', now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}', now());
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS emma FROM public.create_child('Emma', 'Moreau', NULL, 12, '5e', 'Collège test') \gset
INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email) VALUES (:'emma', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'b@test.local');
RESET ROLE;
SELECT set_config('test.emma', :'emma', true) \gset

-- ─── T7 : anon n'atteint plus aucune table (lecture, écriture, vues) ─────────
SELECT set_config('request.jwt.claims', '', true) \gset
SET LOCAL ROLE anon;
DO $$
DECLARE t text; n int := 0;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
           WHERE s.nspname = 'public' AND c.relkind IN ('r', 'v', 'p') ORDER BY 1 LOOP
    BEGIN
      EXECUTE format('SELECT 1 FROM public.%I LIMIT 1', t);
      RAISE EXCEPTION 'ÉCHEC T7 anon lit %', t;
    EXCEPTION WHEN insufficient_privilege THEN n := n + 1; END;
  END LOOP;
  IF n < 40 THEN RAISE EXCEPTION 'ÉCHEC T7 seulement % objets vérifiés', n; END IF;
  BEGIN INSERT INTO public.children (first_name) VALUES ('x'); RAISE EXCEPTION 'ÉCHEC T7 bis anon écrit';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- ─── T8 : invitations : l'invité ne lit plus la table, mais mes_invitations() lui répond ─────────────
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"b@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.invitations_responsable;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T8 l''invité lit % invitation(s) en direct', n; END IF;
  SELECT count(*) INTO n FROM public.mes_invitations();
  IF n <> 1 THEN RAISE EXCEPTION 'ÉCHEC T8 bis mes_invitations() ne renvoie pas l''invitation (%)', n; END IF;
END $$;
-- T9 : un étranger (C) ne voit rien, ni en direct ni par la fonction.
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","email":"c@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.invitations_responsable) <> 0 THEN RAISE EXCEPTION 'ÉCHEC T9 un étranger lit des invitations'; END IF;
  IF (SELECT count(*) FROM public.mes_invitations()) <> 0 THEN RAISE EXCEPTION 'ÉCHEC T9 bis un étranger voit l''invitation d''un autre'; END IF;
END $$;
RESET ROLE;

-- T10 : A (responsable, invitant) la lit toujours ; l'invité peut l'ACCEPTER (fonction), puis devient responsable.
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.invitations_responsable WHERE child_id = current_setting('test.emma')::uuid) <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC T10 le responsable ne lit plus ses invitations';
  END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"b@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
DECLARE r text; inv uuid;
BEGIN
  SELECT invitation_id INTO inv FROM public.mes_invitations();
  r := public.respond_invitation(inv, true);
  IF r <> 'acceptee' THEN RAISE EXCEPTION 'ÉCHEC T10 bis acceptation : %', r; END IF;
  IF NOT public.is_responsable(current_setting('test.emma')::uuid) THEN RAISE EXCEPTION 'ÉCHEC T10 ter l''invité n''est pas devenu responsable'; END IF;
END $$;
RESET ROLE;

-- ─── T11 : profiles.email verrouillé ; le reste du profil reste modifiable par son propriétaire ────────
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"a@test.local","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN UPDATE public.profiles SET email = 'autre@test.local' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'ÉCHEC T11 profiles.email modifiable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.profiles SET first_name = 'Claire-Anne' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF (SELECT first_name FROM public.profiles WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'Claire-Anne' THEN RAISE EXCEPTION 'ÉCHEC T11 bis le prénom ne se modifie plus'; END IF;
  BEGIN UPDATE public.profiles SET role = 'enseignant' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    RAISE EXCEPTION 'ÉCHEC T11 ter role modifiable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- T12 : le serveur (postgres) peut toujours mettre à jour l'email (changement d'adresse côté serveur).
UPDATE public.profiles SET email = 'nouveau@test.local' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

ROLLBACK;
\echo 'M32 : 12 groupes de tests OK (transaction annulée)'
