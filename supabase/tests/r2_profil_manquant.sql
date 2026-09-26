-- Tests R2 · compte authentifié sans profil : ce que l'app peut faire pour terminer l'inscription.
-- À lancer sur une base LOCALE : données de test, transaction annulée.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/r2_profil_manquant.sql

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- Comptes créés SANS profil (comme une inscription interrompue) : le trigger de création
-- automatique du profil est contourné en supprimant le profil juste après.
INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'sans-profil@test.local', 'authenticated', 'authenticated', '{"role":"parent","family_name":"Test"}'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'prof-sans-profil@test.local', 'authenticated', 'authenticated', '{"role":"enseignant"}');
DELETE FROM public.profiles WHERE id IN ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'ffffffff-ffff-4fff-8fff-ffffffffffff');

-- ─── Parent sans profil ─────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN RAISE EXCEPTION 'ÉCHEC T0 le profil existe déjà'; END IF;
  RAISE NOTICE 'OK T0 le compte n''a pas de profil (inscription interrompue)';
  BEGIN
    INSERT INTO public.profiles (id, email, role) VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'x@test.local', 'parent');
    RAISE EXCEPTION 'ÉCHEC T1 profil créé pour un autre compte';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T1 refusé : créer le profil d''un autre compte';
  END;
  BEGIN
    INSERT INTO public.profiles (id, email, role) VALUES (auth.uid(), 'sans-profil@test.local', 'enseignant');
    RAISE EXCEPTION 'ÉCHEC T2 profil enseignant créé par l''utilisateur';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T2 refusé : se créer soi-même un profil « enseignant »';
  END;
  INSERT INTO public.profiles (id, email, family_name, role) VALUES (auth.uid(), 'sans-profil@test.local', 'Test', 'parent');
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent') THEN RAISE EXCEPTION 'ÉCHEC T3'; END IF;
  RAISE NOTICE 'OK T3 le parent termine son inscription : profil « parent » créé (ce que fait l''app)';
  PERFORM public.create_child('Nina', 'Test', NULL, 7, 'CE1', 'École test');
  RAISE NOTICE 'OK T4 ensuite, il peut créer un enfant (create_child) sans erreur';
END $$;
RESET ROLE;

-- ─── Enseignant sans profil : l'app ne peut pas le réparer → écran « Inscription à terminer » ─
SELECT set_config('request.jwt.claims', '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffffff","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, role) VALUES (auth.uid(), 'prof-sans-profil@test.local', 'enseignant');
    RAISE EXCEPTION 'ÉCHEC T5';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'OK T5 enseignant sans profil : création directe refusée (l''app affiche l''écran clair)';
  END;
END $$;
RESET ROLE;

\echo '── Tous les tests R2 sont passés ──'
ROLLBACK;
