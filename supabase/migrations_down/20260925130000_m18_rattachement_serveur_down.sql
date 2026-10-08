-- Inverse de M18 · Rattachement d'une année réservé au serveur.
-- ⚠️ Rouvre la faille classe_id / student_id. À n'exécuter qu'en retour arrière.

DROP TRIGGER IF EXISTS verrou_rattachement_annee ON public.academic_years;
DROP FUNCTION IF EXISTS public.verrou_rattachement_annee();
