-- Inverse de M28 : retire les deux fonctions et revient au déclencheur de départ de M25 (sans l'annulation des
-- invitations : la faille « se réinviter après son départ » est alors rouverte).
DROP FUNCTION IF EXISTS public.apercu_depart_carnet(uuid);
DROP FUNCTION IF EXISTS public.quitter_carnet(uuid);

CREATE OR REPLACE FUNCTION public.supprimer_prives_au_depart()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.carnet_items
  WHERE child_id = OLD.child_id AND ajoute_par = OLD.user_id AND visibilite = 'prive';
  RETURN OLD;
END;
$function$;
