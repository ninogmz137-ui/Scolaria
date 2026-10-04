-- Inverse de M34 : retire le déclencheur et les deux fonctions, et rétablit mes_invitations() d'avant (sans les
-- invitations expirées, sans la colonne `expiree`). Les invitations déjà passées en « annulee » le restent.
-- ATTENTION : l'app qui lit `expiree` / appelle annuler_invitation / renvoyer_invitation doit être revenue en arrière.
DROP TRIGGER IF EXISTS invitations_liberer_expirees ON public.invitations_responsable;
DROP FUNCTION IF EXISTS public.invitations_liberer_expirees();
DROP FUNCTION IF EXISTS public.annuler_invitation(uuid);
DROP FUNCTION IF EXISTS public.renvoyer_invitation(uuid);

DROP FUNCTION IF EXISTS public.mes_invitations();
CREATE FUNCTION public.mes_invitations()
 RETURNS TABLE (invitation_id uuid, prenom_enfant text, prenom_invitant text, lien text, expire_le timestamptz, email_confirme boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT i.id,
         c.first_name,
         COALESCE(NULLIF(btrim(p.first_name), ''), 'Un responsable'),
         i.lien,
         i.expires_at,
         EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL)
  FROM public.invitations_responsable i
  JOIN public.children c ON c.id = i.child_id
  LEFT JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.statut = 'en_attente'
    AND i.expires_at > now()
    AND auth.uid() IS NOT NULL
    AND i.invited_email = lower(coalesce(auth.jwt() ->> 'email', ''))
  ORDER BY i.created_at;
$function$;
REVOKE EXECUTE ON FUNCTION public.mes_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mes_invitations() TO authenticated;
