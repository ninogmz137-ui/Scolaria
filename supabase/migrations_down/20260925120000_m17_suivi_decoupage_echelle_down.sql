-- Inverse de M17 · Suivi : découpage de l'année et échelle des compétences.
-- ⚠️ Supprime les colonnes ajoutées (et leurs valeurs). À n'exécuter qu'en retour arrière.

DROP TRIGGER IF EXISTS valider_echelle_periode ON public.competences;
DROP FUNCTION IF EXISTS public.valider_echelle_periode();
DROP TRIGGER IF EXISTS copie_reglages_classe ON public.academic_years;
DROP FUNCTION IF EXISTS public.copie_reglages_classe();
DROP FUNCTION IF EXISTS public.echelle_competences_annee(uuid);
DROP FUNCTION IF EXISTS public.decoupage_annee(uuid);

ALTER TABLE public.competences
  DROP CONSTRAINT IF EXISTS competences_niveau_check,
  DROP CONSTRAINT IF EXISTS competences_periode_check,
  DROP CONSTRAINT IF EXISTS competences_echelle_check;
ALTER TABLE public.competences
  DROP COLUMN IF EXISTS periode,
  DROP COLUMN IF EXISTS echelle,
  ADD CONSTRAINT competences_niveau_check CHECK (niveau BETWEEN 1 AND 4);

ALTER TABLE public.classes
  DROP COLUMN IF EXISTS echelle_competences,
  DROP COLUMN IF EXISTS decoupage;

ALTER TABLE public.academic_years
  DROP COLUMN IF EXISTS echelle_competences,
  DROP COLUMN IF EXISTS decoupage;
