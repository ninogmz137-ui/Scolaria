-- Inverse de M25 · effacement différé. Restaure is_responsable / est_du_foyer, les policies d'origine
-- (carnet_items_select, carnet_fichiers_lecture, aria_conv_select, aria_msg_select, children_delete)
-- et supprime la table des demandes (le registre des effacements exécutés est perdu).

DROP FUNCTION IF EXISTS public.fichiers_orphelins(interval);
DROP FUNCTION IF EXISTS public.marquer_effacement_execute(uuid);
DROP FUNCTION IF EXISTS public.executer_effacement(uuid);
DROP FUNCTION IF EXISTS public.fichiers_a_effacer(uuid);
DROP FUNCTION IF EXISTS public.enfants_a_effacer(uuid);
DROP FUNCTION IF EXISTS public.effacements_dus();
DROP FUNCTION IF EXISTS public.apercu_effacement_compte();
DROP FUNCTION IF EXISTS public.mes_effacements();
DROP FUNCTION IF EXISTS public.annuler_effacement(uuid);
DROP FUNCTION IF EXISTS public.demander_effacement_compte();
DROP FUNCTION IF EXISTS public.demander_effacement_enfant(uuid);
DROP TRIGGER IF EXISTS supprimer_prives_au_depart ON public.responsables;
DROP FUNCTION IF EXISTS public.supprimer_prives_au_depart();

CREATE POLICY children_delete ON public.children FOR DELETE
  USING (is_responsable(id) AND ((SELECT count(*) FROM public.responsables r WHERE r.child_id = children.id) = 1));

DROP POLICY aria_msg_select ON public.aria_messages;
CREATE POLICY aria_msg_select ON public.aria_messages FOR SELECT
  USING (conversation_id IN (SELECT aria_conversations.id FROM public.aria_conversations WHERE aria_conversations.parent_id = auth.uid()));

DROP POLICY aria_conv_select ON public.aria_conversations;
CREATE POLICY aria_conv_select ON public.aria_conversations FOR SELECT USING (auth.uid() = parent_id);

DROP POLICY carnet_fichiers_lecture ON storage.objects;
CREATE POLICY carnet_fichiers_lecture ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'carnet' AND (owner_id = (auth.uid())::text OR EXISTS (
    SELECT 1 FROM public.carnet_items ci
    WHERE ci.fichier = objects.name AND public.is_responsable(ci.child_id)
      AND (ci.visibilite = 'foyer' OR ci.ajoute_par = auth.uid()))));

DROP POLICY carnet_items_select ON public.carnet_items;
CREATE POLICY carnet_items_select ON public.carnet_items FOR SELECT TO authenticated
  USING (is_responsable(child_id) AND (visibilite = 'foyer' OR ajoute_par = auth.uid()));

CREATE OR REPLACE FUNCTION public.est_du_foyer(p_foyer_id uuid, p_child_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.responsables r
    WHERE r.foyer_id = p_foyer_id AND r.child_id = p_child_id AND r.user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.is_responsable(p_child_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.responsables r
    WHERE r.child_id = p_child_id AND r.user_id = auth.uid());
$function$;

DROP FUNCTION IF EXISTS public.enfant_en_effacement(uuid);
DROP FUNCTION IF EXISTS public.compte_en_effacement(uuid);
DROP TABLE IF EXISTS public.demandes_effacement;
