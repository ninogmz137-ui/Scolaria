-- ════════════════════════════════════════════════════════════════════════════
-- M18 · Rattachement d'une année : réservé au serveur (Phase B, lot B3a) — 2026-09-25
-- Inverse : supabase/migrations_down/20260925130000_m18_rattachement_serveur_down.sql
--
-- Faille corrigée : la politique academic_years_update (is_responsable) ne restreint aucune colonne.
-- Un parent pouvait donc :
--   · classe_id  : rattacher son enfant à n'importe quelle classe (le titulaire obtient l'accès aux
--                  compétences), le détacher, ou changer de classe ; contourner le verrou M17 en
--                  deux requêtes (détacher, puis modifier le découpage) ;
--   · student_id : déplacer une année (et son rattachement) vers un autre de ses enfants — le
--                  titulaire devient titulaire de l'autre enfant ; un co-responsable du premier
--                  enfant seulement perd l'accès à cette année ;
--   · INSERT     : créer une année déjà rattachée à une classe (politique academic_years_insert).
--
-- Règle : un utilisateur de l'app (anon / authenticated : parent comme enseignant) ne pose, ne retire
-- ni ne change jamais academic_years.classe_id, et ne change jamais academic_years.student_id.
-- Seul le serveur (postgres, service_role) le fait. En V1 le rattachement se fait côté serveur ; le
-- parcours enseignant (code de classe validé) viendra au sprint enseignant.
-- Trigger (et non politique) : une politique ne voit pas l'ancienne valeur d'une colonne.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.verrou_rattachement_annee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' AND NEW.classe_id IS NOT NULL THEN
      RAISE EXCEPTION 'le rattachement d''une année à une classe est fait par le serveur'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.classe_id IS DISTINCT FROM OLD.classe_id THEN
      RAISE EXCEPTION 'le rattachement d''une année à une classe est fait par le serveur'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      RAISE EXCEPTION 'une année scolaire ne change pas d''enfant' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.verrou_rattachement_annee() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER verrou_rattachement_annee BEFORE INSERT OR UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.verrou_rattachement_annee();
