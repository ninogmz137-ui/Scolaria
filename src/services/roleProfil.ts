/**
 * roleProfil — le rôle de l'interface (parent / enseignant / élève) vient de `profiles.role` (la base), JAMAIS des
 * métadonnées du compte : la personne peut modifier ses métadonnées (supabase.auth.updateUser), pas `profiles.role`
 * (verrouillé par déclencheur). L'interface n'est de toute façon pas une frontière de sécurité : seule la base l'est
 * (RLS, déclencheurs). Ce rôle ne décide que de l'écran affiché ; hors ligne ou en cas d'échec : « parent »
 * (l'écran le moins privilégié, aucune donnée n'en dépend).
 */

export type RoleProfil = 'parent' | 'enseignant' | 'eleve';

export function roleValide(valeur: unknown): RoleProfil | null {
  return valeur === 'parent' || valeur === 'enseignant' || valeur === 'eleve' ? valeur : null;
}

/** Choix du rôle affiché à partir de la ligne `profiles` (jamais des métadonnées) ; repli : « parent ». */
export function roleAffiche(roleDuProfil: unknown): RoleProfil {
  return roleValide(roleDuProfil) ?? 'parent';
}
