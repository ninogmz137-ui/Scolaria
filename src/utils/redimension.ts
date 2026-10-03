/**
 * Dimensions cibles d'une photo du carnet (L5) : plus grand côté ramené à `max` px, proportions gardées.
 * null = déjà assez petite (pas de redimensionnement, seulement la conversion JPEG sans métadonnées).
 * Fonction pure, testée par `npm run test:photo`.
 */

export const COTE_MAX_PHOTO = 2048;
export const QUALITE_JPEG = 0.8;

export function dimensionsCibles(
  largeur: number,
  hauteur: number,
  max: number = COTE_MAX_PHOTO,
): { width: number } | { height: number } | null {
  if (!(largeur > 0) || !(hauteur > 0)) return null;
  if (Math.max(largeur, hauteur) <= max) return null;
  // Une seule dimension : le module garde les proportions.
  return largeur >= hauteur ? { width: max } : { height: max };
}
