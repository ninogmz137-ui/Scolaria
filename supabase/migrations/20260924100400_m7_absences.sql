-- ════════════════════════════════════════════════════════════════════════════
-- M7 · Absences (Phase A, lot 3a) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924100400_m7_absences_down.sql
--
--  - academic_year_id : text '' → uuid (FK academic_years), rempli par set_academic_year('student_id').
--  - Déclaration par un responsable de l'enfant, en son nom ; visible par tous les responsables de l'enfant.
--  - Modification : par l'auteur de la déclaration uniquement (avant : tout responsable).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.absences ALTER COLUMN academic_year_id DROP DEFAULT;
ALTER TABLE public.absences ALTER COLUMN academic_year_id DROP NOT NULL;
ALTER TABLE public.absences ALTER COLUMN academic_year_id TYPE uuid USING nullif(academic_year_id, '')::uuid;
ALTER TABLE public.absences ADD CONSTRAINT absences_academic_year_id_fkey
  FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;
CREATE INDEX idx_absences_academic_year ON public.absences USING btree (academic_year_id);

CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('student_id');

-- Insertion (inchangée) : signalee_par = auth.uid() AND is_responsable(student_id).
-- Lecture (inchangée) : is_responsable(student_id) → tous les responsables de l'enfant.
ALTER POLICY absences_parent_update ON public.absences
  USING (signalee_par = auth.uid() AND public.is_responsable(student_id))
  WITH CHECK (signalee_par = auth.uid() AND public.is_responsable(student_id));
