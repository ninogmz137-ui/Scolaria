/**
 * Rôles proposés à l'inscription.
 * Version RÉELLE : « parent » seulement. Aucun chemin légitime ne produit un compte enseignant aujourd'hui
 * (audit de sécurité B3 : handle_new_user ignore le rôle demandé, protect_profile_role interdit de le changer) ;
 * proposer « Enseignant » à une famille serait une fonction qui ne marche pas. Le choix reste disponible en
 * développement (__DEV__) et en démo, pour montrer et tester le parcours enseignant. Masqué = absent de l'écran
 * (jamais grisé), et la valeur envoyée est forcée à « parent » même si l'état de l'écran disait autre chose.
 */

export type RoleInscription = 'parent' | 'enseignant';

export const ROLES_INSCRIPTION: { id: RoleInscription; label: string; desc: string }[] = [
  { id: 'parent', label: 'Parent', desc: 'Suivre la scolarité de mes enfants' },
  { id: 'enseignant', label: 'Enseignant', desc: 'Gérer ma classe et communiquer' },
];

/** Le choix du rôle est-il visible ? Développement ou démo uniquement. */
export function roleEnseignantVisible(dev: boolean, demo: boolean): boolean {
  return dev || demo;
}

export function rolesProposes(dev: boolean, demo: boolean) {
  return roleEnseignantVisible(dev, demo) ? ROLES_INSCRIPTION : ROLES_INSCRIPTION.filter((r) => r.id === 'parent');
}

/** Rôle réellement utilisé : « parent » dès que le choix n'est pas proposé. */
export function roleEffectif(choisi: RoleInscription, dev: boolean, demo: boolean): RoleInscription {
  return roleEnseignantVisible(dev, demo) ? choisi : 'parent';
}
