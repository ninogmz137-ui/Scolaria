-- Inverse de M44 (absence refusée sans classe avec titulaire).
DROP TRIGGER IF EXISTS verifier_classe_absence ON public.absences;
DROP FUNCTION IF EXISTS public.absences_verifier_classe();
