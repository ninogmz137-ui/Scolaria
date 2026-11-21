-- M32 · Droits de table et accès (audit de sécurité : constats B1, B4, B5, B8). LOCALE, NON appliquée à Paris.
--
--  1. B1 · anon n'a AUCUN droit sur les tables, vues et séquences du schéma public (les écrans d'ouverture
--     passent par l'API d'authentification, jamais par une table). Les tables futures n'en reçoivent plus non plus.
--  2. B1 · authenticated perd TRUNCATE, TRIGGER, REFERENCES (jamais exposés par l'API, jamais utilisés par l'app) ;
--     SELECT / INSERT / UPDATE / DELETE restent : c'est la RLS (testée table par table) qui décide.
--  3. B8 · Tables inutilisées : accès COUPÉ (aucun droit pour anon ni authenticated), SANS suppression : messages,
--     deletion_requests, export_history, transfer_codes, access_journal, person_permissions. Elles sont vides sur
--     Paris ; seul le service et les fonctions du serveur (executer_effacement, SECURITY DEFINER) les touchent encore.
--     Rétablir l'accès = une ligne GRANT (voir le script inverse).
--  4. B5 · invitations_responsable : la lecture directe par l'INVITÉ est retirée (il passait par `invited_email = email
--     du jeton`, et voyait child_id / invited_by / expiration). L'invité ne lit que mes_invitations() (prénoms, lien,
--     expiration) ; les responsables de l'enfant continuent de lire les invitations de leur carnet.
--  5. B4 · profiles.email (copie d'affichage que personne ne lit) n'est plus modifiable par l'utilisateur
--     (même verrou que role et plan). La colonne reste (anciennes versions de l'app qui l'écrivent à la création).
--
-- Inverse : supabase/migrations_down/20260928170000_m32_droits_et_acces_down.sql

-- ─── 1. anon : rien ─────────────────────────────────────────────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- ─── 2. authenticated : plus de TRUNCATE / TRIGGER / REFERENCES ─────────────
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM authenticated;

-- ─── 3. Tables inutilisées : accès coupé, données et politiques conservées ──
REVOKE ALL ON public.messages, public.deletion_requests, public.export_history,
              public.transfer_codes, public.access_journal, public.person_permissions
  FROM anon, authenticated;

-- ─── 4. invitations_select : responsables seulement ─────────────────────────
DROP POLICY IF EXISTS invitations_select ON public.invitations_responsable;
CREATE POLICY invitations_select ON public.invitations_responsable
  FOR SELECT TO authenticated
  USING (public.is_responsable(child_id));

-- ─── 5. profiles.email : verrouillé comme role et plan ──────────────────────
CREATE OR REPLACE FUNCTION public.protect_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'profiles.role ne peut pas être modifié par l''utilisateur'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'profiles.plan ne peut pas être modifié par l''utilisateur'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'profiles.email ne peut pas être modifié par l''utilisateur'
        USING ERRCODE = '42501';
    END IF;
    -- Création directe d'un profil (si handle_new_user a échoué) : parent, forfait gratuit uniquement.
    IF TG_OP = 'INSERT' AND (NEW.role IS DISTINCT FROM 'parent' OR NEW.plan IS DISTINCT FROM 'free') THEN
      RAISE EXCEPTION 'un profil créé par l''utilisateur est toujours « parent », forfait gratuit'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
