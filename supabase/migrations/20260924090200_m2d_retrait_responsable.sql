-- ════════════════════════════════════════════════════════════════════════════
-- M2d · Retrait d'un responsable (Phase A, lot 2-bis) — 2026-09-24
-- Inverse : supabase/migrations_down/<version>_m2d_retrait_responsable_down.sql
--
-- Garde partagée : un responsable ne peut PAS retirer un autre responsable ; il peut seulement se
-- retirer lui-même. Le retrait d'un autre parent passera plus tard par une procédure vérifiée
-- (serveur). Le DERNIER responsable ne peut pas se retirer (l'enfant deviendrait inaccessible) :
-- il doit supprimer l'enfant ou inviter quelqu'un d'abord.
-- ════════════════════════════════════════════════════════════════════════════

CREATE POLICY responsables_delete_self ON public.responsables FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- SECURITY INVOKER : current_user = rôle de l'appelant. Les suppressions en cascade (enfant supprimé)
-- et celles du serveur s'exécutent sous un autre rôle et ne sont pas bloquées.
CREATE OR REPLACE FUNCTION public.prevent_last_responsable_removal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND EXISTS (SELECT 1 FROM public.children c WHERE c.id = OLD.child_id)
     AND NOT EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = OLD.child_id AND r.id <> OLD.id) THEN
    RAISE EXCEPTION 'dernier responsable de l''enfant : supprimez l''enfant ou invitez un autre responsable d''abord'
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.prevent_last_responsable_removal() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER prevent_last_responsable_removal
  BEFORE DELETE ON public.responsables
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_responsable_removal();
