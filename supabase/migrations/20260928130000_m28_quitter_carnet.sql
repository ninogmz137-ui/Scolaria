-- M28 · « Me retirer de ce carnet » (droit d'un responsable : il ne peut retirer QUE lui-même, jamais le dernier).
--
-- Déjà en place : policy responsables_delete_self (on ne supprime que sa propre ligne), déclencheur
-- prevent_last_responsable_removal (jamais le dernier responsable), enregistrement du départ du foyer (M23),
-- suppression des ajouts PRIVÉS du partant (M25 : supprimer_prives_au_depart ; ses ajouts « foyer » restent).
--
-- Ajouts de M28 :
--  1. FAILLE FERMÉE : une invitation envoyée par un responsable restait valable après son départ
--     (respond_invitation ne revérifie pas l'invitant) → il pouvait se réinviter et retrouver l'accès. Le
--     déclencheur de départ annule désormais ses invitations en attente pour CE carnet.
--  2. quitter_carnet(enfant) : une seule action, erreurs claires (non_responsable, dernier_responsable).
--     SECURITY INVOKER : la policy et le déclencheur s'appliquent comme pour un DELETE direct.
--  3. apercu_depart_carnet(enfant) : ce que le départ supprime (ajouts privés) et garde (ajouts partagés), pour la
--     confirmation affichée avant d'agir.

CREATE OR REPLACE FUNCTION public.supprimer_prives_au_depart()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.carnet_items
  WHERE child_id = OLD.child_id AND ajoute_par = OLD.user_id AND visibilite = 'prive';
  -- Invitations en attente envoyées par le partant pour ce carnet : annulées (sinon il pourrait se réinviter).
  UPDATE public.invitations_responsable
  SET statut = 'annulee', responded_at = now()
  WHERE child_id = OLD.child_id AND invited_by = OLD.user_id AND statut = 'en_attente';
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.quitter_carnet(p_child_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_n integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_connecte' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(*) FROM public.responsables r WHERE r.child_id = p_child_id) <= 1
     AND EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = p_child_id AND r.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'dernier_responsable' USING ERRCODE = '23514';
  END IF;
  DELETE FROM public.responsables WHERE child_id = p_child_id AND user_id = auth.uid();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'non_responsable' USING ERRCODE = '42501';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apercu_depart_carnet(p_child_id uuid)
 RETURNS TABLE (nb_prives integer, nb_partages integer, nb_responsables integer)
 LANGUAGE sql
 STABLE
 SET search_path = public, pg_temp
AS $function$
  SELECT
    (SELECT count(*)::integer FROM public.carnet_items ci
       WHERE ci.child_id = p_child_id AND ci.ajoute_par = auth.uid() AND ci.visibilite = 'prive'),
    (SELECT count(*)::integer FROM public.carnet_items ci
       WHERE ci.child_id = p_child_id AND ci.ajoute_par = auth.uid() AND ci.visibilite = 'foyer'),
    (SELECT count(*)::integer FROM public.responsables r WHERE r.child_id = p_child_id);
$function$;

REVOKE EXECUTE ON FUNCTION public.quitter_carnet(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apercu_depart_carnet(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quitter_carnet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apercu_depart_carnet(uuid) TO authenticated;
