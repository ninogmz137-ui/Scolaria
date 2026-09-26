-- M21 · Expéditeur lisible des mots du carnet (B4a, 26 sept 2026).
--
-- Un responsable ne peut lire que SON profil (profiles_select : auth.uid() = id) : il ne voit donc pas
-- le nom de l'enseignant qui a envoyé un mot. Cette fonction renvoie, pour le carnet d'un enfant dont
-- l'appelant est responsable, le nom affichable de l'expéditeur de chaque mot (« Prénom Nom »).
-- Rien d'autre du profil (ni e-mail, ni téléphone, ni rôle). Aucun résultat si l'appelant n'est pas
-- responsable de l'enfant.

CREATE OR REPLACE FUNCTION public.mots_carnet_expediteurs(p_child_id uuid)
 RETURNS TABLE (mot_id uuid, expediteur text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT m.id,
         COALESCE(NULLIF(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.family_name, '')), ''), 'Enseignant')
  FROM public.mot_carnets mc
  JOIN public.mots_liaison m ON m.id = mc.mot_id
  LEFT JOIN public.profiles p ON p.id = m.teacher_id
  WHERE mc.child_id = p_child_id
    AND m.statut <> 'brouillon'
    AND public.is_responsable(p_child_id);
$function$;

REVOKE EXECUTE ON FUNCTION public.mots_carnet_expediteurs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mots_carnet_expediteurs(uuid) TO authenticated;
