/**
 * Responsables légaux de la démo — source UNIQUE (mots, fils, Autorisations). MODE DÉMO UNIQUEMENT.
 *
 * - Vous : Claire Moreau, responsable des 3 enfants.
 * - Léa et Lucas : Marc Moreau, dans VOTRE foyer (fil famille partagé, « Seulement moi » possible).
 * - Emma : famille recomposée (décision du 27 sept 2026) — son père, Julien Moreau, vit dans un AUTRE
 *   foyer : il a son propre fil famille avec les enseignants, ne voit ni vos fils ni vos réponses ;
 *   les messages de l'enseignant envoyés aux deux foyers portent « Envoyé aussi à Julien ».
 */

export const MOI_DEMO = { prenom: 'Claire', nom: 'Moreau' };

export interface AutreResponsableDemo {
  id: string;
  prenom: string;
  nom: string;
  /** Même foyer que vous (fil famille partagé) ou autre foyer (fils séparés). */
  memeFoyer: boolean;
}

const MARC: AutreResponsableDemo = { id: 'demo-marc', prenom: 'Marc', nom: 'Moreau', memeFoyer: true };
const JULIEN: AutreResponsableDemo = { id: 'demo-julien', prenom: 'Julien', nom: 'Moreau', memeFoyer: false };

/** L'autre responsable légal de l'enfant (démo). */
export function autreResponsableDemo(childId: string | undefined): AutreResponsableDemo {
  return childId === 'demo-emma' ? JULIEN : MARC;
}
