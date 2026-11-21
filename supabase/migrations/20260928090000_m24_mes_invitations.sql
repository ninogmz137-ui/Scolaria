-- M24 · Invitations reçues, vues par l'invité (L4, 28 sept 2026).
--
-- L'invité n'est pas (encore) responsable : il ne peut lire ni l'enfant ni le profil de l'invitant. Pour
-- afficher « Claire vous invite à suivre le carnet de Léa », cette fonction renvoie, pour SES invitations
-- en attente et non expirées (adresse du compte = adresse invitée), uniquement : l'id de l'invitation, le
-- prénom de l'enfant, le prénom de l'invitant, le lien et l'expiration. Rien d'autre (ni nom de famille,
-- ni email, ni identifiant d'enfant).
-- `email_confirme` indique si l'invité doit d'abord confirmer son email (respond_invitation l'exige).

CREATE OR REPLACE FUNCTION public.mes_invitations()
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
