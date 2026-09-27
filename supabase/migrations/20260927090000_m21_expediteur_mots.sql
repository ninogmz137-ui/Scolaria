-- M21 · Expéditeur lisible d'un mot du carnet (B4a, 26-27 sept 2026).
--
-- Un responsable ne peut lire que SON profil (profiles_select : auth.uid() = id) : il ne voit donc pas
-- le nom de l'enseignant qui a envoyé un mot. Cette fonction renvoie UNIQUEMENT le nom affichable de
-- l'expéditeur (« Prénom Nom », ou « Enseignant » s'il n'a pas de nom) d'UN mot :
--   - aucun e-mail, aucun téléphone, aucun rôle, AUCUN identifiant (ni de l'enseignant, ni du mot) ;
--   - NULL si l'appelant n'est responsable d'aucun enfant dont le carnet contient ce mot, ou si le mot
--     est un brouillon.
-- Version du 27 sept : la première écriture (mots_carnet_expediteurs) renvoyait aussi mot_id ; jamais
-- appliquée à Paris, remplacée avant application.

DROP FUNCTION IF EXISTS public.mots_carnet_expediteurs(uuid);

CREATE OR REPLACE FUNCTION public.mot_expediteur(p_mot_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
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

REVOKE EXECUTE ON FUNCTION public.mot_expediteur(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mot_expediteur(uuid) TO authenticated;
