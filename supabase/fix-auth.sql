-- ═══════════════════════════════════════════════════════════
-- SCOLARIA — FIX : "Database error saving new user"
-- ═══════════════════════════════════════════════════════════
--
-- Exécute ce fichier dans le SQL Editor de Supabase
-- APRÈS avoir exécuté schema.sql
--
-- Problèmes corrigés :
--   1. Politique INSERT manquante sur profiles
--   2. Trigger handle_new_user sans search_path sécurisé
--   3. Pas de gestion d'erreur dans le trigger
--

-- ─── 1. Ajouter la politique INSERT sur profiles ────────
-- Permet à un utilisateur authentifié de créer son propre profil

DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── 2. Recréer le trigger avec search_path sécurisé ───
-- Supabase exige SET search_path pour les fonctions SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, family_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'family_name', split_part(COALESCE(NEW.email, ''), '@', 1), '')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur mais ne bloque pas la création du user
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 3. Recréer le trigger sur auth.users ───────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 4. Vérification : tester que la table profiles existe ─

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'Table profiles does not exist! Run schema.sql first.';
  END IF;
  RAISE NOTICE '✅ Table profiles exists';
END $$;

-- ─── 5. Vérification : tester que RLS est activé ────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'profiles' AND schemaname = 'public' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '⚠️ RLS was disabled on profiles, now enabled';
  ELSE
    RAISE NOTICE '✅ RLS is enabled on profiles';
  END IF;
END $$;

-- ─── 6. Lister toutes les politiques sur profiles ───────

SELECT
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
