-- M4 · INVERSE — retire le rattachement à l'année (colonnes, FK, index et trigger ajoutés par M4).
-- ⚠️ Perte des academic_year_id renseignés.
DROP TRIGGER IF EXISTS set_academic_year ON public.appreciations;
DROP TRIGGER IF EXISTS set_academic_year ON public.teacher_conversations;
DROP TRIGGER IF EXISTS set_academic_year ON public.signatures;
DROP TRIGGER IF EXISTS set_academic_year ON public.messages;
DROP TRIGGER IF EXISTS set_academic_year ON public.subjects;
DROP TRIGGER IF EXISTS set_academic_year ON public.checkins;
DROP TRIGGER IF EXISTS set_academic_year ON public.agenda_events;
DROP TRIGGER IF EXISTS set_academic_year ON public.grades;
DROP FUNCTION IF EXISTS public.set_academic_year();

ALTER TABLE public.appreciations DROP CONSTRAINT IF EXISTS appreciations_student_id_fkey;
ALTER TABLE public.teacher_conversations DROP CONSTRAINT IF EXISTS teacher_conversations_student_id_fkey;
DROP INDEX IF EXISTS public.idx_appreciations_student;
DROP INDEX IF EXISTS public.idx_teacher_conv_student;

ALTER TABLE public.appreciations         DROP COLUMN IF EXISTS academic_year_id;
ALTER TABLE public.teacher_conversations DROP COLUMN IF EXISTS academic_year_id;
ALTER TABLE public.signatures            DROP COLUMN IF EXISTS academic_year_id;
ALTER TABLE public.messages              DROP COLUMN IF EXISTS academic_year_id;
ALTER TABLE public.subjects              DROP COLUMN IF EXISTS academic_year_id;
ALTER TABLE public.checkins              DROP COLUMN IF EXISTS academic_year_id;
ALTER TABLE public.agenda_events         DROP COLUMN IF EXISTS academic_year_id;
ALTER TABLE public.grades                DROP COLUMN IF EXISTS academic_year_id;
