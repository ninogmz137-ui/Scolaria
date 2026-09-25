-- ════════════════════════════════════════════════════════════════════════════
-- M9b · Correctif M9 : calcul de la source d'une compétence (Phase A, lot 3b) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924110400_m9b_competences_source_down.sql
--
-- Dans une fonction SECURITY DEFINER, current_user = propriétaire (postgres) : le test
-- « current_user IN ('anon','authenticated') » n'était jamais vrai et la source n'était pas calculée
-- (détecté par les tests : insertion du titulaire refusée par la RLS). La fonction passe en
-- SECURITY INVOKER ; elle n'utilise que des fonctions d'aide exécutables par authenticated.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_source_competence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.child_id <> OLD.child_id OR NEW.academic_year_id IS DISTINCT FROM OLD.academic_year_id
       OR NEW.source <> OLD.source OR NEW.saisi_par <> OLD.saisi_par THEN
      RAISE EXCEPTION 'enfant, année, source et auteur d''une compétence ne sont pas modifiables' USING ERRCODE = '42501';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Appels via l'API uniquement ; service_role / postgres gardent la main (imports serveur).
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.saisi_par := auth.uid();
    IF public.is_titulaire_annee(NEW.academic_year_id) THEN
      NEW.source := 'ecole';
    ELSIF public.is_responsable(NEW.child_id) THEN
      NEW.source := 'parent';
    ELSE
      RAISE EXCEPTION 'ni responsable de l''enfant, ni titulaire de sa classe' USING ERRCODE = '42501';
    END IF;
  END IF;
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.set_source_competence() FROM PUBLIC, anon, authenticated;
