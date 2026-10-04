-- Inverse de M32 : rétablit les droits larges d'avant (anon et authenticated : tous les privilèges sur les tables),
-- l'ancienne lecture des invitations par l'invité et le profil sans verrou sur email.
-- ATTENTION : ceci RÉOUVRE l'accès direct de anon aux tables (la RLS reste la seule protection).
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
-- Ces deux tables n'avaient AUCUN droit client avant M32 (M26, M31) : on ne les rouvre pas.
REVOKE ALL ON public.aria_usage_quotidien, public.journal_executions_effacement FROM anon, authenticated;

DROP POLICY IF EXISTS invitations_select ON public.invitations_responsable;
CREATE POLICY invitations_select ON public.invitations_responsable
  FOR SELECT TO authenticated
  USING (public.is_responsable(child_id) OR invited_email = lower(COALESCE((auth.jwt() ->> 'email'), '')));

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
    IF TG_OP = 'INSERT' AND (NEW.role IS DISTINCT FROM 'parent' OR NEW.plan IS DISTINCT FROM 'free') THEN
      RAISE EXCEPTION 'un profil créé par l''utilisateur est toujours « parent », forfait gratuit'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
