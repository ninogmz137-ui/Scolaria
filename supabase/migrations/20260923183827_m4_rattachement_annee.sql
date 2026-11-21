-- ════════════════════════════════════════════════════════════════════════════
-- M4 · Rattachement à l'année scolaire (Phase A, lot 2) — 2026-09-23
-- Inverse : supabase/migrations_down/<version>_m4_rattachement_annee_down.sql
--
-- Toute donnée de carnet porte l'enfant + l'année. Tables concernées (colonne enfant) :
--   grades (child_id), agenda_events (child_id), checkins (child_id), subjects (child_id),
--   messages (child_id, nullable), signatures (student_id), teacher_conversations (student_id),
--   appreciations (student_id).
-- Déjà conformes : bulletins, academic_years. Lot 3 : absences (type texte → M7), mots_liaison (M5).
--
-- academic_year_id est NULLABLE : un enfant peut ne pas encore avoir d'année. Le trigger
-- set_academic_year : (1) si absent → année ACTIVE de l'enfant ; (2) si fourni → doit appartenir
-- au même enfant, sinon refus. ON DELETE SET NULL : supprimer une année ne supprime aucune donnée.
-- FK ajoutées : teacher_conversations.student_id et appreciations.student_id → children (tables vides).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Colonnes + FK + index ──────────────────────────────────────────────────
ALTER TABLE public.grades                ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;
ALTER TABLE public.agenda_events         ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;
ALTER TABLE public.checkins              ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;
ALTER TABLE public.subjects              ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;
ALTER TABLE public.messages              ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;
ALTER TABLE public.signatures            ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;
ALTER TABLE public.teacher_conversations ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;
ALTER TABLE public.appreciations         ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;

ALTER TABLE public.teacher_conversations
  ADD CONSTRAINT teacher_conversations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.children(id) ON DELETE CASCADE;
ALTER TABLE public.appreciations
  ADD CONSTRAINT appreciations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.children(id) ON DELETE CASCADE;

CREATE INDEX idx_grades_academic_year ON public.grades USING btree (academic_year_id);
CREATE INDEX idx_agenda_academic_year ON public.agenda_events USING btree (academic_year_id);
CREATE INDEX idx_checkins_academic_year ON public.checkins USING btree (academic_year_id);
CREATE INDEX idx_subjects_academic_year ON public.subjects USING btree (academic_year_id);
CREATE INDEX idx_messages_academic_year ON public.messages USING btree (academic_year_id);
CREATE INDEX idx_signatures_academic_year ON public.signatures USING btree (academic_year_id);
CREATE INDEX idx_teacher_conv_academic_year ON public.teacher_conversations USING btree (academic_year_id);
CREATE INDEX idx_appreciations_academic_year ON public.appreciations USING btree (academic_year_id);
CREATE INDEX idx_teacher_conv_student ON public.teacher_conversations USING btree (student_id);
CREATE INDEX idx_appreciations_student ON public.appreciations USING btree (student_id);

-- ─── Trigger : année active par défaut, cohérence enfant ↔ année ────────────
-- TG_ARGV[0] = nom de la colonne enfant de la table (child_id ou student_id).
CREATE OR REPLACE FUNCTION public.set_academic_year()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_child uuid := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
BEGIN
  IF v_child IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.academic_year_id IS NULL THEN
    SELECT ay.id INTO NEW.academic_year_id
    FROM public.academic_years ay
    WHERE ay.student_id = v_child AND ay.statut = 'active'
    ORDER BY ay.created_at DESC
    LIMIT 1;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.academic_years ay WHERE ay.id = NEW.academic_year_id AND ay.student_id = v_child
  ) THEN
    RAISE EXCEPTION 'academic_year_id n''appartient pas à cet enfant' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.set_academic_year() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.grades                FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');
CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.agenda_events         FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');
CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.checkins              FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');
CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.subjects              FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');
CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.messages              FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');
CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.signatures            FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('student_id');
CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.teacher_conversations FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('student_id');
CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.appreciations         FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('student_id');
