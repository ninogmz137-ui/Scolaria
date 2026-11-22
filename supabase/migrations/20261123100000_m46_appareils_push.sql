-- M46 — notifications, 1/3 : téléphones (jetons Expo) et réglages de notification (lot 7a, plan validé le 22 nov. 2026).
-- Inverse : supabase/migrations_down/20261123100000_m46_appareils_push_down.sql.
--
-- appareils_push : un compte = plusieurs téléphones ; un téléphone = le DERNIER compte connecté dessus (un jeton déjà
--   inscrit par un autre compte lui est retiré : jamais les notifications d'une famille sur le téléphone d'une autre).
--   Chacun lit, ajoute, met à jour et supprime SES lignes. À la déconnexion, l'app supprime la ligne de ce téléphone ;
--   un jeton refusé par Expo est désactivé par le serveur (clé de service).
-- preferences_notifications : les trois réglages (essentielles, résumé de 18 h, silence 20 h – 7 h), en base parce que
--   c'est le serveur qui décide d'envoyer ; absent = tout activé. Réglages indépendants (décision Q4).
-- Advisors : aucun WARN nouveau attendu (une politique par commande, (SELECT auth.uid()) ; fonction de déclencheur
-- SECURITY DEFINER exécutable par personne ; clés étrangères indexées).

CREATE TABLE public.appareils_push (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jeton text NOT NULL UNIQUE CHECK (length(jeton) BETWEEN 10 AND 300),
  plateforme text NOT NULL CHECK (plateforme IN ('android', 'ios')),
  cree_le timestamptz NOT NULL DEFAULT now(),
  vu_le timestamptz NOT NULL DEFAULT now(),
  actif boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_appareils_push_user ON public.appareils_push USING btree (user_id);
ALTER TABLE public.appareils_push ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.appareils_push FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.appareils_push TO authenticated;
COMMENT ON TABLE public.appareils_push IS
  'Jetons Expo des téléphones (lot 7a, M46) : un compte, plusieurs téléphones ; un téléphone, le dernier compte connecté. Chacun ses lignes.';

CREATE POLICY appareils_push_select ON public.appareils_push FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY appareils_push_insert ON public.appareils_push FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY appareils_push_update ON public.appareils_push FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY appareils_push_delete ON public.appareils_push FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Un téléphone = le dernier compte connecté : le jeton est retiré à tout AUTRE compte avant l'inscription.
CREATE OR REPLACE FUNCTION public.appareils_push_un_compte()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.appareils_push WHERE jeton = NEW.jeton AND user_id <> NEW.user_id;
  NEW.vu_le := now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.appareils_push_un_compte() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER appareils_push_un_compte BEFORE INSERT ON public.appareils_push
  FOR EACH ROW EXECUTE FUNCTION public.appareils_push_un_compte();

CREATE TABLE public.preferences_notifications (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  essentielles boolean NOT NULL DEFAULT true,
  resume_18h boolean NOT NULL DEFAULT true,
  silence boolean NOT NULL DEFAULT true,
  maj_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.preferences_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.preferences_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.preferences_notifications TO authenticated;
COMMENT ON TABLE public.preferences_notifications IS
  'Réglages de notification (lot 7a, M46) : essentielles, résumé de 18 h, silence 20 h – 7 h (heure de Paris). Absent = tout activé.';

CREATE POLICY preferences_notifications_select ON public.preferences_notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY preferences_notifications_insert ON public.preferences_notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY preferences_notifications_update ON public.preferences_notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
