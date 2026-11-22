-- M47 — notifications, 2/3 : file d'envoi remplie par la base (lot 7a, plan validé le 22 nov. 2026).
-- Inverse : supabase/migrations_down/20261123110000_m47_file_notifications_down.sql.
--
-- Un parent est notifié pour : un mot reçu (action ou non), un message de l'enseignant, une absence à justifier (absence
-- signalée par l'école, lot 7b), la relance d'un mot (fonction relancer_mot du lot 7b). JAMAIS pour une photo, une
-- compétence ou un document (aucun déclencheur sur ces tables).
-- Destinataires (règle des parents séparés) :
--   - mot (une copie par carnet) : les responsables de CET enfant (l'information de l'école est partagée) ;
--   - message d'un fil « foyer » : les responsables de l'enfant DANS CE FOYER ; fil « individuel » : ce parent seul ;
--     jamais l'autre foyer ;
--   - absence signalée par quelqu'un qui n'est pas responsable de l'enfant (l'école) : les responsables de l'enfant.
-- La file ne contient JAMAIS de texte de message, de motif ni de justificatif : l'enfant, le type, l'expéditeur (nom
-- lisible), l'identifiant de l'élément. `envoyer_apres` = maintenant, ou 7 h 00 heure de Paris si l'élément arrive
-- entre 20 h et 7 h et que le destinataire a le silence activé (défaut : oui).
-- Aucun compte ne lit ni n'écrit la file (RLS sans politique) : seul le serveur (fonction envoyer-notifications).
-- Advisors : aucun WARN nouveau attendu (fonctions SECURITY DEFINER exécutables par personne) ; une INFO possible
-- « RLS activée sans politique » sur notifications_file (voulu).

CREATE TABLE public.notifications_file (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinataire uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('mot', 'message', 'absence_a_justifier', 'relance')),
  expediteur text,
  ref_id uuid,
  cree_le timestamptz NOT NULL DEFAULT now(),
  envoyer_apres timestamptz NOT NULL DEFAULT now(),
  envoyee_le timestamptz,
  resultat text
);
CREATE INDEX idx_notifications_file_dues ON public.notifications_file USING btree (envoyer_apres) WHERE envoyee_le IS NULL;
CREATE INDEX idx_notifications_file_destinataire ON public.notifications_file USING btree (destinataire);
CREATE INDEX idx_notifications_file_child ON public.notifications_file USING btree (child_id);
ALTER TABLE public.notifications_file ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notifications_file FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.notifications_file IS
  'File des notifications (lot 7a, M47) : enfant, type, expéditeur lisible, identifiant ; jamais de texte. Lue par le serveur seul.';

-- Moment d'envoi : silence 20 h – 7 h (heure de Paris) si le destinataire l'a activé (défaut : oui).
CREATE OR REPLACE FUNCTION public.notifications_moment(p_destinataire uuid, p_maintenant timestamptz DEFAULT now())
 RETURNS timestamptz
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_silence boolean;
  v_local timestamp := p_maintenant AT TIME ZONE 'Europe/Paris';
BEGIN
  SELECT p.silence INTO v_silence FROM public.preferences_notifications p WHERE p.user_id = p_destinataire;
  IF NOT coalesce(v_silence, true) THEN
    RETURN p_maintenant;
  END IF;
  IF v_local::time >= time '20:00' THEN
    RETURN ((v_local::date + 1) + time '07:00') AT TIME ZONE 'Europe/Paris';
  ELSIF v_local::time < time '07:00' THEN
    RETURN (v_local::date + time '07:00') AT TIME ZONE 'Europe/Paris';
  END IF;
  RETURN p_maintenant;
END;
$function$;
REVOKE ALL ON FUNCTION public.notifications_moment(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

-- Ajout dans la file (un destinataire), sauf compte ou enfant en cours d'effacement.
CREATE OR REPLACE FUNCTION public.notifications_ajouter(p_destinataire uuid, p_child uuid, p_type text, p_expediteur text, p_ref uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF p_destinataire IS NULL OR public.compte_en_effacement(p_destinataire) OR public.enfant_en_effacement(p_child) THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications_file (destinataire, child_id, type, expediteur, ref_id, envoyer_apres)
  VALUES (p_destinataire, p_child, p_type, left(btrim(regexp_replace(coalesce(p_expediteur, ''), '\s+', ' ', 'g')), 60), p_ref,
          public.notifications_moment(p_destinataire));
END;
$function$;
REVOKE ALL ON FUNCTION public.notifications_ajouter(uuid, uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- Nom lisible d'un profil (enseignant) : « Prénom Nom », sinon « l'enseignant ». La civilité arrive au lot 7.
CREATE OR REPLACE FUNCTION public.notifications_nom(p_profil uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT coalesce(nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.family_name, '')), ''), 'l’enseignant')
  FROM (SELECT p_profil AS id) x LEFT JOIN public.profiles p ON p.id = x.id;
$function$;
REVOKE ALL ON FUNCTION public.notifications_nom(uuid) FROM PUBLIC, anon, authenticated;

-- 1. Mot reçu (une copie par carnet) → responsables de cet enfant. Brouillons ignorés.
CREATE OR REPLACE FUNCTION public.notifications_sur_mot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_mot record;
  r record;
BEGIN
  SELECT m.teacher_id, m.statut INTO v_mot FROM public.mots_liaison m WHERE m.id = NEW.mot_id;
  IF NOT FOUND OR v_mot.statut = 'brouillon' THEN
    RETURN NEW;
  END IF;
  FOR r IN SELECT DISTINCT re.user_id FROM public.responsables re WHERE re.child_id = NEW.child_id LOOP
    PERFORM public.notifications_ajouter(r.user_id, NEW.child_id, 'mot', public.notifications_nom(v_mot.teacher_id), NEW.mot_id);
  END LOOP;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.notifications_sur_mot() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notifications_sur_mot AFTER INSERT ON public.mot_carnets
  FOR EACH ROW EXECUTE FUNCTION public.notifications_sur_mot();

-- 2. Message de l'enseignant → fil foyer : les responsables de l'enfant DANS CE FOYER ; fil individuel : ce parent seul.
CREATE OR REPLACE FUNCTION public.notifications_sur_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  c record;
  r record;
  v_nom text;
BEGIN
  IF NEW.sender_role IS DISTINCT FROM 'teacher' THEN
    RETURN NEW;
  END IF;
  SELECT tc.student_id, tc.portee, tc.foyer_id, tc.parent_id, tc.teacher_id INTO c
  FROM public.teacher_conversations tc WHERE tc.id = NEW.conversation_id;
  IF NOT FOUND OR c.student_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_nom := public.notifications_nom(coalesce(NEW.sender_id, c.teacher_id));
  IF c.portee = 'individuel' THEN
    IF EXISTS (SELECT 1 FROM public.responsables re WHERE re.child_id = c.student_id AND re.user_id = c.parent_id) THEN
      PERFORM public.notifications_ajouter(c.parent_id, c.student_id, 'message', v_nom, NEW.conversation_id);
    END IF;
  ELSIF c.foyer_id IS NOT NULL THEN
    FOR r IN SELECT DISTINCT re.user_id FROM public.responsables re WHERE re.child_id = c.student_id AND re.foyer_id = c.foyer_id LOOP
      PERFORM public.notifications_ajouter(r.user_id, c.student_id, 'message', v_nom, NEW.conversation_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.notifications_sur_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notifications_sur_message AFTER INSERT ON public.teacher_messages
  FOR EACH ROW EXECUTE FUNCTION public.notifications_sur_message();

-- 3. Absence signalée par l'école (son auteur n'est pas responsable de l'enfant) → responsables de l'enfant.
CREATE OR REPLACE FUNCTION public.notifications_sur_absence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM public.responsables re WHERE re.child_id = NEW.student_id AND re.user_id = NEW.signalee_par) THEN
    RETURN NEW; -- signalée par un parent : il le sait déjà
  END IF;
  FOR r IN SELECT DISTINCT re.user_id FROM public.responsables re WHERE re.child_id = NEW.student_id LOOP
    PERFORM public.notifications_ajouter(r.user_id, NEW.student_id, 'absence_a_justifier', public.notifications_nom(NEW.signalee_par), NEW.id);
  END LOOP;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.notifications_sur_absence() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notifications_sur_absence AFTER INSERT ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.notifications_sur_absence();
