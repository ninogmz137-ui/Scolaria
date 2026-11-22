-- Inverse de M47 (file des notifications et déclencheurs). Les éléments en attente sont perdus (aucune donnée du carnet).
BEGIN;
DROP TRIGGER IF EXISTS notifications_sur_absence ON public.absences;
DROP TRIGGER IF EXISTS notifications_sur_message ON public.teacher_messages;
DROP TRIGGER IF EXISTS notifications_sur_mot ON public.mot_carnets;
DROP FUNCTION IF EXISTS public.notifications_sur_absence();
DROP FUNCTION IF EXISTS public.notifications_sur_message();
DROP FUNCTION IF EXISTS public.notifications_sur_mot();
DROP FUNCTION IF EXISTS public.notifications_nom(uuid);
-- mot_expediteur et fil_enseignant : définitions d'avant M47 (sans nom_affiche_enseignant).
CREATE OR REPLACE FUNCTION public.mot_expediteur(p_mot_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(NULLIF(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.family_name, '')), ''), 'Enseignant')
  FROM public.mots_liaison m
  LEFT JOIN public.profiles p ON p.id = m.teacher_id
  WHERE m.id = p_mot_id
    AND m.statut <> 'brouillon'
    AND EXISTS (
      SELECT 1 FROM public.mot_carnets mc
      WHERE mc.mot_id = m.id AND public.is_responsable(mc.child_id)
    );
$function$;
CREATE OR REPLACE FUNCTION public.fil_enseignant(p_conversation_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(NULLIF(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.family_name, '')), ''), 'Enseignant')
  FROM public.teacher_conversations c LEFT JOIN public.profiles p ON p.id = c.teacher_id
  WHERE c.id = p_conversation_id
    AND (public.peut_lire_fil(c.id) OR public.depart_du_fil(c.id) IS NOT NULL);
$function$;
DROP FUNCTION IF EXISTS public.nom_affiche_enseignant(uuid);
DROP FUNCTION IF EXISTS public.notifications_ajouter(uuid, uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.notifications_moment(uuid, timestamptz);
DROP TABLE IF EXISTS public.notifications_file;
COMMIT;
