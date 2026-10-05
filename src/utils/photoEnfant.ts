/**
 * Photo de l'enfant — règles pures (sans module natif), testées par `npm run test:photo-enfant`.
 *
 * Un seul objet par enfant dans le bucket PRIVÉ « child-photos » : `<id de l'enfant>/avatar.jpg`
 * (la contrainte children_photo_path_check et les politiques de M35 imposent exactement ce chemin).
 * La photo est ré-encodée sur l'appareil AVANT l'envoi : carré centré, 512 × 512, JPEG qualité 0,8 — aucune
 * métadonnée n'est recopiée (EXIF, GPS…), et le nettoyage JavaScript (utils/metadonneesImage) passe ensuite en
 * seconde sécurité.
 */

export const COTE_PHOTO_ENFANT = 512;
export const QUALITE_PHOTO_ENFANT = 0.8;
export const BUCKET_PHOTOS = 'child-photos';

/** Chemin de l'unique objet de l'enfant. */
export function cheminPhotoEnfant(childId: string): string {
  return `${childId}/avatar.jpg`;
}

export interface RecadragePhoto {
  /** Rectangle carré centré à découper dans l'image d'origine. */
  recadrage: { originX: number; originY: number; width: number; height: number };
  /** Côté final après redimensionnement (jamais agrandi au-delà du recadrage). */
  cote: number;
}

/**
 * Carré centré le plus grand possible dans l'image (le sélecteur recadre déjà en carré ; ceci rattrape les
 * appareils qui renvoient un rectangle), puis réduit à 512 px — jamais agrandi. null : dimensions inconnues.
 */
export function recadrerEnCarre(largeur: number, hauteur: number): RecadragePhoto | null {
  if (!(largeur > 0 && hauteur > 0)) return null;
  const c = Math.floor(Math.min(largeur, hauteur));
  return {
    recadrage: { originX: Math.floor((largeur - c) / 2), originY: Math.floor((hauteur - c) / 2), width: c, height: c },
    cote: Math.min(c, COTE_PHOTO_ENFANT),
  };
}

/** Clé du cache en mémoire des URL signées : chemin + date de mise à jour (une nouvelle photo change la clé). */
export function clePhoto(photoPath: string, updatedAt?: string | null): string {
  return `${photoPath}|${updatedAt ?? ''}`;
}

/** Les URL signées valent 1 h ; on les réutilise 50 min au plus (marge de sécurité avant l'expiration). */
export const DUREE_URL_SIGNEE_S = 60 * 60;
export const DUREE_CACHE_MS = 50 * 60 * 1000;

/** Durées de vie du cache : vrai tant que l'URL signée mémorisée est encore sûre. */
export function urlEncoreValable(creeeLe: number, maintenant: number): boolean {
  return maintenant - creeeLe < DUREE_CACHE_MS;
}
