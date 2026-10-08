-- M9 · INVERSE — supprime les compétences. ⚠️ Perte des compétences saisies (avec accord uniquement).
DROP TABLE IF EXISTS public.competences;
DROP FUNCTION IF EXISTS public.set_source_competence();
DROP FUNCTION IF EXISTS public.is_titulaire_annee(uuid);
