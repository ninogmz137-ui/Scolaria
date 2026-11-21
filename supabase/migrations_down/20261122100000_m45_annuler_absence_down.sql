-- Inverse de M45 (annulation d'une absence). Les absences « annulée » repassent « signalée » (aucune ligne supprimée).
BEGIN;
DROP TRIGGER IF EXISTS absences_controler_modification ON public.absences;
DROP FUNCTION IF EXISTS public.absences_controler_modification();
UPDATE public.absences SET statut = 'signalée' WHERE statut = 'annulée';
ALTER POLICY absences_parent_update ON public.absences
  USING ((signalee_par = auth.uid()) AND is_responsable(student_id))
  WITH CHECK ((signalee_par = auth.uid()) AND is_responsable(student_id));
DROP INDEX IF EXISTS public.idx_absences_annulee_par;
ALTER TABLE public.absences DROP COLUMN IF EXISTS annulee_par, DROP COLUMN IF EXISTS annulee_le;
ALTER TABLE public.absences DROP CONSTRAINT absences_statut_check;
ALTER TABLE public.absences ADD CONSTRAINT absences_statut_check
  CHECK (statut = ANY (ARRAY['signalée'::text, 'prise_en_compte'::text]));
COMMIT;
