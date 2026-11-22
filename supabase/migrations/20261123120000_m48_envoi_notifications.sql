-- M48 — notifications, 3/3 : lecture pour l'envoi, résumé de 18 h, tâches planifiées (lot 7a, plan validé le 22 nov. 2026).
-- Inverse : supabase/migrations_down/20261123120000_m48_envoi_notifications_down.sql.
--
-- Fonctions réservées au SERVEUR (exécutables par service_role seul, appelées par l'Edge Function envoyer-notifications) :
--   notifications_dues        éléments à envoyer maintenant, avec prénom de l'enfant, réglage « essentielles » et jetons ;
--   notifications_marquer     marque des éléments envoyés (ou coupés, sans téléphone, simulés) ;
--   appareils_desactiver      désactive les jetons refusés par Expo (téléphone désinstallé) ;
--   notifications_resume      résumé de 18 h (heure de Paris) : par parent ET par enfant qui a quelque chose (mots à traiter
--                             par CE parent, absences à justifier, devoirs pour demain non cochés) ; une fois par jour ;
--   notifications_resume_marquer  note le résumé du jour comme fait.
-- Tâches (pg_cron, base) → pg_net → Edge Function, clé de service lue dans le coffre (même modèle que M26) :
--   chaque minute « envoyer-notifications » (seulement s'il y a quelque chose de dû) ;
--   16 h 00 ET 17 h 00 UTC « resume-18h » : la fonction ne renvoie rien si l'heure de Paris n'est pas 18 h (été, hiver).
-- Sans les secrets du coffre (`cle_service_notifications`, `url_projet`), le lanceur NE FAIT RIEN (base locale, ou Paris
-- avant leur création) : jamais d'appel vers une adresse par défaut.
-- Advisors : aucun WARN nouveau attendu (aucune fonction exécutable par anon ou authenticated).

-- Résumés déjà faits (un par parent et par jour de Paris).
CREATE TABLE public.notifications_resumes (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jour date NOT NULL,
  PRIMARY KEY (user_id, jour)
);
ALTER TABLE public.notifications_resumes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notifications_resumes FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notifications_dues(p_maintenant timestamptz DEFAULT now(), p_limite integer DEFAULT 500)
 RETURNS TABLE (id uuid, destinataire uuid, child_id uuid, prenom text, type text, expediteur text, ref_id uuid,
                essentielles boolean, jetons text[])
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT f.id, f.destinataire, f.child_id, c.first_name, f.type, f.expediteur, f.ref_id,
         coalesce(p.essentielles, true),
         coalesce((SELECT array_agg(a.jeton ORDER BY a.vu_le DESC) FROM public.appareils_push a
                   WHERE a.user_id = f.destinataire AND a.actif), ARRAY[]::text[])
  FROM public.notifications_file f
  JOIN public.children c ON c.id = f.child_id
  LEFT JOIN public.preferences_notifications p ON p.user_id = f.destinataire
  WHERE f.envoyee_le IS NULL AND f.envoyer_apres <= p_maintenant
    -- Toujours responsable de l'enfant au moment de l'envoi (un départ du carnet entre-temps : rien).
    AND EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = f.child_id AND r.user_id = f.destinataire)
  ORDER BY f.envoyer_apres, f.cree_le
  LIMIT p_limite;
$function$;

CREATE OR REPLACE FUNCTION public.notifications_marquer(p_ids uuid[], p_resultat text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  n integer;
BEGIN
  UPDATE public.notifications_file SET envoyee_le = now(), resultat = left(p_resultat, 40)
  WHERE id = ANY (p_ids) AND envoyee_le IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  -- Éléments devenus sans objet (le parent a quitté le carnet) : marqués aussi, pour ne pas rester dans la file.
  UPDATE public.notifications_file f SET envoyee_le = now(), resultat = 'plus_responsable'
  WHERE f.envoyee_le IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.responsables r WHERE r.child_id = f.child_id AND r.user_id = f.destinataire);
  RETURN n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.appareils_desactiver(p_jetons text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  n integer;
BEGIN
  UPDATE public.appareils_push SET actif = false WHERE jeton = ANY (p_jetons) AND actif;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notifications_resume(p_maintenant timestamptz DEFAULT now())
 RETURNS TABLE (destinataire uuid, child_id uuid, prenom text, mots integer, absences integer, devoirs integer, jetons text[])
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_local timestamp := p_maintenant AT TIME ZONE 'Europe/Paris';
  v_jour date := v_local::date;
BEGIN
  IF extract(hour FROM v_local) <> 18 THEN
    RETURN; -- 18 h heure de Paris seulement (deux tâches UTC couvrent l'heure d'été et d'hiver)
  END IF;
  RETURN QUERY
  WITH parents AS (
    SELECT DISTINCT re.user_id, re.child_id, re.foyer_id
    FROM public.responsables re
    LEFT JOIN public.preferences_notifications p ON p.user_id = re.user_id
    WHERE coalesce(p.resume_18h, true)
      AND EXISTS (SELECT 1 FROM public.appareils_push a WHERE a.user_id = re.user_id AND a.actif)
      AND NOT EXISTS (SELECT 1 FROM public.notifications_resumes nr WHERE nr.user_id = re.user_id AND nr.jour = v_jour)
      AND NOT public.compte_en_effacement(re.user_id)
      AND NOT public.enfant_en_effacement(re.child_id)
  ), comptes AS (
    SELECT pa.user_id, pa.child_id,
      -- Mots qui attendent une action de CE parent : signature (mode « one » : personne n'a signé ; « both » : pas lui)
      -- ou réponse (autorisation, participation, question) qu'il n'a pas donnée.
      (SELECT count(*) FROM public.mot_carnets mc JOIN public.mots_liaison m ON m.id = mc.mot_id
        WHERE mc.child_id = pa.child_id AND m.statut <> 'brouillon' AND (
          (m.signature_mode = 'one' AND NOT EXISTS (SELECT 1 FROM public.signatures s WHERE s.mot_id = m.id AND s.student_id = pa.child_id))
          OR (m.signature_mode = 'both' AND NOT EXISTS (SELECT 1 FROM public.signatures s WHERE s.mot_id = m.id AND s.student_id = pa.child_id AND s.parent_id = pa.user_id))
          OR ((m.type IN ('autorisation', 'participation') OR m.question)
              AND NOT EXISTS (SELECT 1 FROM public.reponses_mot r WHERE r.mot_id = m.id AND r.child_id = pa.child_id AND r.responsable_id = pa.user_id))
        ))::integer AS mots,
      -- Absences à justifier : non annulées, sans justificatif, de moins de 30 jours, signalées par MON foyer ou par l'école.
      (SELECT count(*) FROM public.absences ab
        WHERE ab.student_id = pa.child_id AND ab.statut <> 'annulée'
          AND coalesce(ab.date_fin, ab.date_debut) >= v_jour - 30
          AND NOT EXISTS (SELECT 1 FROM public.absences_justificatifs j WHERE j.absence_id = ab.id)
          AND (EXISTS (SELECT 1 FROM public.responsables r2 WHERE r2.child_id = ab.student_id AND r2.user_id = ab.signalee_par AND r2.foyer_id = pa.foyer_id)
               OR NOT EXISTS (SELECT 1 FROM public.responsables r3 WHERE r3.child_id = ab.student_id AND r3.user_id = ab.signalee_par))
      )::integer AS absences,
      -- Devoirs pour demain (jour de Paris), non cochés.
      (SELECT count(*) FROM public.agenda_events ev
        WHERE ev.child_id = pa.child_id AND ev.event_type = 'devoir' AND NOT coalesce(ev.is_done, false)
          AND (ev.start_time AT TIME ZONE 'Europe/Paris')::date = v_jour + 1)::integer AS devoirs
    FROM parents pa
  )
  SELECT co.user_id, co.child_id, ch.first_name, co.mots, co.absences, co.devoirs,
         (SELECT array_agg(a.jeton ORDER BY a.vu_le DESC) FROM public.appareils_push a WHERE a.user_id = co.user_id AND a.actif)
  FROM comptes co JOIN public.children ch ON ch.id = co.child_id
  WHERE co.mots + co.absences + co.devoirs > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notifications_resume_marquer(p_users uuid[], p_maintenant timestamptz DEFAULT now())
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
  INSERT INTO public.notifications_resumes (user_id, jour)
  SELECT DISTINCT u, (p_maintenant AT TIME ZONE 'Europe/Paris')::date FROM unnest(p_users) u
  ON CONFLICT DO NOTHING;
$function$;

-- Droits : service_role seul (l'Edge Function) ; aucun compte.
REVOKE ALL ON FUNCTION public.notifications_dues(timestamptz, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notifications_marquer(uuid[], text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.appareils_desactiver(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notifications_resume(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notifications_resume_marquer(uuid[], timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notifications_dues(timestamptz, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.notifications_marquer(uuid[], text) TO service_role;
GRANT EXECUTE ON FUNCTION public.appareils_desactiver(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.notifications_resume(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.notifications_resume_marquer(uuid[], timestamptz) TO service_role;

-- Lanceur (pg_cron → pg_net) : rien sans les secrets du coffre ; en mode « file », rien s'il n'y a rien de dû.
CREATE OR REPLACE FUNCTION public.lancer_envoyer_notifications(p_mode text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_cle text;
  v_url text;
BEGIN
  SELECT decrypted_secret INTO v_cle FROM vault.decrypted_secrets WHERE name = 'cle_service_notifications';
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'url_projet';
  IF v_cle IS NULL OR v_url IS NULL THEN
    RETURN;
  END IF;
  IF p_mode = 'file' AND NOT EXISTS (
    SELECT 1 FROM public.notifications_file WHERE envoyee_le IS NULL AND envoyer_apres <= now()
  ) THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/envoyer-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_cle),
    body := jsonb_build_object('mode', p_mode),
    timeout_milliseconds := 30000
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.lancer_envoyer_notifications(text) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('envoyer-notifications', '* * * * *', $$select public.lancer_envoyer_notifications('file')$$);
SELECT cron.schedule('resume-18h-ete', '0 16 * * *', $$select public.lancer_envoyer_notifications('resume')$$);
SELECT cron.schedule('resume-18h-hiver', '0 17 * * *', $$select public.lancer_envoyer_notifications('resume')$$);
