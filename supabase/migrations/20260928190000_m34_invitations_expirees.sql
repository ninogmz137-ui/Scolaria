-- M34 · Invitation expirée : plus de piège (constat du 4 oct 2026, preuve 3 de la validation de M30). LOCALE, NON appliquée à Paris.
--
-- Avant : au bout de 7 jours l'invitation restait « en_attente » en base. L'invité ne la voyait plus (sans message),
-- l'invitant non plus, et RÉINVITER la même adresse échouait pour toujours (index unique `uq_invitation_en_attente`,
-- aucune notion d'expiration), sans bouton Annuler ni Renvoyer.
--
--  1. Réinviter la même adresse : un déclencheur passe en « annulee » les invitations EXPIRÉES du même (enfant, adresse)
--     juste avant l'insertion. L'unicité ne bloque donc plus que les invitations en attente ET non expirées (un index
--     partiel ne peut pas utiliser now() : l'expiration est traitée à l'insertion).
--  2. annuler_invitation(id) et renvoyer_invitation(id) : réservées aux responsables de l'enfant (même message d'erreur
--     pour un étranger et pour une invitation inconnue). Renvoyer = annule l'ancienne et en crée une nouvelle, valable
--     7 jours (durée imposée par le serveur, M30) ; l'app envoie ensuite l'email avec le nouvel identifiant.
--  3. mes_invitations() (vue de l'invité) renvoie aussi les invitations EXPIRÉES depuis moins de 30 jours, marquées
--     `expiree` : l'app dit « Invitation expirée, demandez à [prénom] de vous réinviter ». On ne peut jamais accepter
--     une invitation expirée (respond_invitation inchangée).
--
-- Inverse : supabase/migrations_down/20260928190000_m34_invitations_expirees_down.sql

-- ─── 1. Réinviter après expiration ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invitations_liberer_expirees()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.invitations_responsable
     SET statut = 'annulee', responded_at = now()
   WHERE child_id = NEW.child_id AND invited_email = NEW.invited_email
     AND statut = 'en_attente' AND expires_at <= now();
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.invitations_liberer_expirees() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS invitations_liberer_expirees ON public.invitations_responsable;
CREATE TRIGGER invitations_liberer_expirees BEFORE INSERT ON public.invitations_responsable
  FOR EACH ROW EXECUTE FUNCTION public.invitations_liberer_expirees();

-- ─── 2. Annuler / renvoyer (responsables de l'enfant seulement) ─────────────
CREATE OR REPLACE FUNCTION public.annuler_invitation(p_invitation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_inv public.invitations_responsable;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentification requise' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_inv FROM public.invitations_responsable WHERE id = p_invitation_id FOR UPDATE;
  -- Même message si l'invitation n'existe pas ou si l'appelant n'est pas responsable de l'enfant.
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = v_inv.child_id AND r.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'invitation introuvable' USING ERRCODE = '42501';
  END IF;
  IF v_inv.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'invitation déjà traitée' USING ERRCODE = '22023';
  END IF;
  UPDATE public.invitations_responsable SET statut = 'annulee', responded_at = now() WHERE id = v_inv.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.renvoyer_invitation(p_invitation_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_inv public.invitations_responsable;
  v_nouvelle uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentification requise' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_inv FROM public.invitations_responsable WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = v_inv.child_id AND r.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'invitation introuvable' USING ERRCODE = '42501';
  END IF;
  IF v_inv.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'invitation déjà traitée' USING ERRCODE = '22023';
  END IF;
  UPDATE public.invitations_responsable SET statut = 'annulee', responded_at = now() WHERE id = v_inv.id;
  -- Nouvelle invitation, à mon nom ; la durée de 7 jours est fixée par le déclencheur invitations_expiration (M30).
  INSERT INTO public.invitations_responsable (child_id, invited_by, invited_email, lien)
  VALUES (v_inv.child_id, auth.uid(), v_inv.invited_email, v_inv.lien)
  RETURNING id INTO v_nouvelle;
  RETURN v_nouvelle;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.annuler_invitation(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.renvoyer_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.annuler_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renvoyer_invitation(uuid) TO authenticated;

-- ─── 3. L'invité voit aussi les invitations expirées (30 jours) ─────────────
DROP FUNCTION IF EXISTS public.mes_invitations();
CREATE FUNCTION public.mes_invitations()
 RETURNS TABLE (invitation_id uuid, prenom_enfant text, prenom_invitant text, lien text, expire_le timestamptz, email_confirme boolean, expiree boolean)
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
         EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL),
         i.expires_at <= now()
  FROM public.invitations_responsable i
  JOIN public.children c ON c.id = i.child_id
  LEFT JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.statut = 'en_attente'
    AND i.expires_at > now() - interval '30 days'
    AND auth.uid() IS NOT NULL
    AND i.invited_email = lower(coalesce(auth.jwt() ->> 'email', ''))
  ORDER BY (i.expires_at <= now()), i.created_at;
$function$;
REVOKE EXECUTE ON FUNCTION public.mes_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mes_invitations() TO authenticated;
