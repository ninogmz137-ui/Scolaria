-- ════════════════════════════════════════════════════════════════════════════
-- M2e · Suppression d'un enfant (Phase A, lot 3a — correctif préalable) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924100000_m2e_suppression_enfant_down.sql
--
-- Un enfant ne peut être supprimé QUE par son UNIQUE responsable. Dès qu'il a 2 responsables ou
-- plus, la suppression est refusée : chacun peut seulement se retirer (M2d).
-- Le comptage voit tous les co-responsables de l'enfant (policy responsables_select, M2).
-- ════════════════════════════════════════════════════════════════════════════

ALTER POLICY children_delete ON public.children
  USING (
    public.is_responsable(id)
    AND (SELECT count(*) FROM public.responsables r WHERE r.child_id = children.id) = 1
  );
