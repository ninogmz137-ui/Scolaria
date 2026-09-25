-- Inverse de M19 · statut d'une année réservé au serveur.
DROP TRIGGER IF EXISTS verrou_statut_annee ON public.academic_years;
DROP FUNCTION IF EXISTS public.verrou_statut_annee();
ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_enfant_millesime_unique;
ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_annee_scolaire_format;
