-- ════════════════════════════════════════════════════════════════════════════
-- M2c · Invitations de responsables (Phase A, lot 2-bis) — 2026-09-24
-- Inverse : supabase/migrations_down/<version>_m2c_invitations_responsables_down.sql
--
-- Règle : un responsable n'est ajouté QUE par invitation d'un responsable existant, ACCEPTÉE par
-- l'invité. Personne ne s'auto-rattache à un enfant existant.
--  - responsables : AUCUNE policy INSERT/UPDATE → écriture directe impossible pour les utilisateurs.
--  - invitations_responsable : créée par un responsable de l'enfant, visible par les responsables
--    de l'enfant et par l'invité (email du compte, vérifié).
--  - respond_invitation() : seul l'invité (email confirmé = email invité) accepte ou refuse ;
--    l'acceptation crée le lien responsable dans le foyer de l'invitant.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.invitations_responsable (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  child_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  invited_email text NOT NULL,
  lien text DEFAULT 'parent'::text NOT NULL,
  statut text DEFAULT 'en_attente'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
  responded_at timestamp with time zone,
  CONSTRAINT invitations_responsable_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_responsable_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE,
  CONSTRAINT invitations_responsable_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT invitations_responsable_email_check CHECK (invited_email = lower(invited_email) AND position('@' IN invited_email) > 1),
  CONSTRAINT invitations_responsable_lien_check CHECK ((lien = ANY (ARRAY['parent'::text, 'tuteur'::text, 'autre'::text]))),
  CONSTRAINT invitations_responsable_statut_check CHECK ((statut = ANY (ARRAY['en_attente'::text, 'acceptee'::text, 'refusee'::text, 'annulee'::text])))
);
-- Une seule invitation en attente par enfant et par email.
CREATE UNIQUE INDEX uq_invitation_en_attente ON public.invitations_responsable (child_id, invited_email) WHERE statut = 'en_attente';
CREATE INDEX idx_invitations_child ON public.invitations_responsable USING btree (child_id);
CREATE INDEX idx_invitations_email ON public.invitations_responsable USING btree (invited_email);

ALTER TABLE public.invitations_responsable ENABLE ROW LEVEL SECURITY;

-- Création : par un responsable de l'enfant, en son nom, statut « en_attente » uniquement.
CREATE POLICY invitations_insert ON public.invitations_responsable FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND public.is_responsable(child_id) AND statut = 'en_attente');

-- Lecture : responsables de l'enfant, et l'invité (email de son compte).
CREATE POLICY invitations_select ON public.invitations_responsable FOR SELECT TO authenticated
  USING (public.is_responsable(child_id) OR invited_email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Pas de policy UPDATE / DELETE : les réponses passent par respond_invitation().

CREATE OR REPLACE FUNCTION public.respond_invitation(p_invitation_id uuid, p_accept boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_inv public.invitations_responsable;
  v_foyer uuid;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'authentification requise' USING ERRCODE = '42501';
  END IF;
  -- Email du compte confirmé (empêche de revendiquer une invitation avec un email non vérifié).
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v_uid AND u.email_confirmed_at IS NOT NULL AND lower(u.email) = v_email) THEN
    RAISE EXCEPTION 'email du compte non confirmé' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv FROM public.invitations_responsable WHERE id = p_invitation_id FOR UPDATE;
  -- Même message si l'invitation n'existe pas ou n'est pas destinée à cet utilisateur.
  IF NOT FOUND OR v_inv.invited_email <> v_email THEN
    RAISE EXCEPTION 'invitation introuvable' USING ERRCODE = '42501';
  END IF;
  IF v_inv.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'invitation déjà traitée' USING ERRCODE = '22023';
  END IF;
  IF v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'invitation expirée' USING ERRCODE = '22023';
  END IF;

  IF NOT p_accept THEN
    UPDATE public.invitations_responsable SET statut = 'refusee', responded_at = now() WHERE id = v_inv.id;
    RETURN 'refusee';
  END IF;

  -- Foyer de l'invitant ; à défaut, celui d'un responsable restant de l'enfant.
  SELECT r.foyer_id INTO v_foyer FROM public.responsables r
  WHERE r.child_id = v_inv.child_id
  ORDER BY (r.user_id = v_inv.invited_by) DESC, r.created_at
  LIMIT 1;
  IF v_foyer IS NULL THEN
    RAISE EXCEPTION 'plus aucun responsable pour cet enfant' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  VALUES (v_foyer, v_uid, v_inv.child_id, v_inv.lien)
  ON CONFLICT (user_id, child_id) DO NOTHING;

  UPDATE public.invitations_responsable SET statut = 'acceptee', responded_at = now() WHERE id = v_inv.id;
  RETURN 'acceptee';
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.respond_invitation(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_invitation(uuid, boolean) TO authenticated;
