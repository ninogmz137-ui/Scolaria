-- M7 · INVERSE — academic_year_id redevient text '' (état après M2).
ALTER POLICY absences_parent_update ON public.absences
  USING (public.is_responsable(student_id))
  WITH CHECK (public.is_responsable(student_id));  -- équivalent de l'absence de WITH CHECK
DROP TRIGGER IF EXISTS set_academic_year ON public.absences;
DROP INDEX IF EXISTS public.idx_absences_academic_year;
ALTER TABLE public.absences DROP CONSTRAINT IF EXISTS absences_academic_year_id_fkey;
ALTER TABLE public.absences ALTER COLUMN academic_year_id TYPE text USING COALESCE(academic_year_id::text, '');
UPDATE public.absences SET academic_year_id = '' WHERE academic_year_id IS NULL;
ALTER TABLE public.absences ALTER COLUMN academic_year_id SET DEFAULT ''::text;
ALTER TABLE public.absences ALTER COLUMN academic_year_id SET NOT NULL;
