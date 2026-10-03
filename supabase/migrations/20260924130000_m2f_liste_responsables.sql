-- ════════════════════════════════════════════════════════════════════════════
-- M2f · Liste des responsables d'un enfant (Phase B, lot B1-bis) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924130000_m2f_liste_responsables_down.sql
--
-- Besoin : l'écran « Autorisations » affiche les VRAIS responsables légaux de l'enfant.
-- La table responsables est lisible par les co-responsables, mais la policy profiles_select
-- (auth.uid() = id) masque le nom de l'autre responsable.
--
-- responsables_enfant(child_id) : SECURITY DEFINER, lecture seule, réservée aux responsables
-- de l'enfant (sinon 0 ligne). Minimisation : prénom, nom, lien, « c'est moi » — jamais l'email,
-- le téléphone ni le rôle de l'autre responsable.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.responsables_enfant(p_child_id uuid)
RETURNS TABLE (user_id uuid, prenom text, nom text, lien text, est_moi boolean, depuis timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.user_id,
         coalesce(p.first_name, ''),
         coalesce(p.family_name, ''),
         r.lien,
         r.user_id = auth.uid(),
         r.created_at
  FROM public.responsables r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.child_id = p_child_id
    AND public.is_responsable(p_child_id)
  ORDER BY (r.user_id = auth.uid()) DESC, r.created_at;
$$;

REVOKE EXECUTE ON FUNCTION public.responsables_enfant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responsables_enfant(uuid) TO authenticated;
