-- M31 · Limite quotidienne d'appels à Aria, PAR COMPTE (audit de sécurité, constat B6 : sans limite, un compte
-- pouvait générer un coût Anthropic illimité).
--
--  - aria_usage_quotidien : un compteur par (compte, jour de Paris). Aucun contenu, aucun texte, seulement un nombre.
--    RLS activée SANS politique et aucun droit pour anon / authenticated : illisible et inmodifiable depuis l'app ;
--    seule l'Edge Function « aria » (clé service) y accède, par les deux fonctions ci-dessous.
--  - aria_reserver(compte, limite) : réserve UN appel de façon atomique (une seule instruction : pas de course entre
--    deux appels simultanés). Renvoie (autorise, utilises). Purge au passage les compteurs de plus de 7 jours.
--  - aria_rendre(compte) : rend l'appel réservé quand le modèle n'a pas répondu (un échec ne coûte rien à la famille).
--  - Les deux fonctions : EXECUTE réservé au service. Un compte ne peut ni se rendre des appels, ni lire un compteur.
--  - Compte supprimé : ses compteurs partent avec lui (clé étrangère en cascade).
-- Le plafond lui-même (40 par jour par défaut) vit dans l'Edge Function (secret facultatif ARIA_LIMITE_JOUR).
--
-- Inverse : supabase/migrations_down/20260928160000_m31_limite_aria_down.sql

CREATE TABLE public.aria_usage_quotidien (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  jour    date NOT NULL,
  nb      integer NOT NULL DEFAULT 0 CHECK (nb >= 0),
  PRIMARY KEY (user_id, jour)
);
ALTER TABLE public.aria_usage_quotidien ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aria_usage_quotidien FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.aria_reserver(p_user uuid, p_limite integer)
 RETURNS TABLE (autorise boolean, utilises integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_jour date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_nb   integer;
BEGIN
  IF p_user IS NULL OR p_limite IS NULL OR p_limite < 1 THEN
    RAISE EXCEPTION 'aria_reserver : paramètres invalides' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.aria_usage_quotidien WHERE user_id = p_user AND jour < v_jour - 7;

  -- Une seule instruction : crée le compteur du jour à 1, ou l'incrémente SEULEMENT s'il est sous la limite.
  INSERT INTO public.aria_usage_quotidien AS u (user_id, jour, nb)
  VALUES (p_user, v_jour, 1)
  ON CONFLICT (user_id, jour) DO UPDATE SET nb = u.nb + 1 WHERE u.nb < p_limite
  RETURNING u.nb INTO v_nb;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_nb;
    RETURN;
  END IF;

  SELECT u.nb INTO v_nb FROM public.aria_usage_quotidien u WHERE u.user_id = p_user AND u.jour = v_jour;
  RETURN QUERY SELECT false, COALESCE(v_nb, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.aria_rendre(p_user uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  UPDATE public.aria_usage_quotidien
     SET nb = GREATEST(nb - 1, 0)
   WHERE user_id = p_user AND jour = (now() AT TIME ZONE 'Europe/Paris')::date;
$function$;

REVOKE EXECUTE ON FUNCTION public.aria_reserver(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aria_rendre(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aria_reserver(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.aria_rendre(uuid) TO service_role;
