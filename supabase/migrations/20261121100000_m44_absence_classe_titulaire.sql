-- M44 — absence refusée par la base pour un enfant dont l'école n'est pas sur l'app (lot 5, point 1 ; règle du
-- 21 nov. 2026, CLAUDE.md § Agenda › Absence signalée par le parent).
-- Inverse : supabase/migrations_down/20261121100000_m44_absence_classe_titulaire_down.sql.
--
-- Une absence n'est acceptée que si son année est l'année ACTIVE de l'enfant ET que cette année a une classe avec un
-- titulaire (academic_years.statut = 'active' → classe_id → classes.enseignant_id non nul). Sinon : refus (42501).
-- C'est la règle de l'écran (useEnseignantRattache) appliquée par la base : aucune absence ne part vers une école
-- absente de l'app, même par un appel direct à l'API.
--
-- Contrôlé à l'INSERT, et à l'UPDATE seulement si l'enfant ou l'année changent (une absence déjà enregistrée reste
-- modifiable si la classe disparaît ensuite).
-- Ordre des déclencheurs (alphabétique) : « verifier_classe_absence » passe APRÈS « set_academic_year », qui remplit
-- academic_year_id avec l'année active quand l'app ne l'envoie pas.
-- Advisors : aucun WARN nouveau attendu (fonction de déclencheur SECURITY DEFINER non exécutable par un compte,
-- search_path vide, comme absences_justificatifs_controler de M42).

CREATE OR REPLACE FUNCTION public.absences_verifier_classe()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.student_id IS NOT DISTINCT FROM OLD.student_id
     AND NEW.academic_year_id IS NOT DISTINCT FROM OLD.academic_year_id THEN
    RETURN NEW;
  END IF;
  IF NEW.academic_year_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.academic_years ay
    JOIN public.classes c ON c.id = ay.classe_id
    WHERE ay.id = NEW.academic_year_id
      AND ay.student_id = NEW.student_id
      AND ay.statut = 'active'
      AND c.enseignant_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'absence refusée : l''école de cet enfant n''est pas sur l''app' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.absences_verifier_classe() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER verifier_classe_absence BEFORE INSERT OR UPDATE OF student_id, academic_year_id ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.absences_verifier_classe();
