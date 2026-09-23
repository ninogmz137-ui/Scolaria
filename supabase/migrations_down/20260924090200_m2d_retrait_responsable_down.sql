-- M2d · INVERSE — plus aucune suppression de lien par l'utilisateur (état après M2c).
DROP TRIGGER IF EXISTS prevent_last_responsable_removal ON public.responsables;
DROP FUNCTION IF EXISTS public.prevent_last_responsable_removal();
DROP POLICY IF EXISTS responsables_delete_self ON public.responsables;
