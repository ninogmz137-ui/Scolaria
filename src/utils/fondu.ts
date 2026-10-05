/**
 * Courbe du fondu de l'en-tête de l'Accueil (COMPONENTS §6) — module pur, sans dépendance, testé hors Metro
 * (src/utils/fondu.test.mts) : HeaderFondu s'en sert pour dessiner, les tests pour calculer les contrastes.
 */

/** [position 0 → 1, opacité de la couleur]. Plein sur ~40 %, puis décroissance ease-out (10 arrêts). */
export const ARRETS_FONDU: [number, number][] = [
  [0, 1],
  [0.4, 1],
  [0.5, 0.94],
  [0.58, 0.84],
  [0.66, 0.68],
  [0.74, 0.5],
  [0.82, 0.32],
  [0.89, 0.17],
  [0.95, 0.06],
  [1, 0],
];

/** Opacité de la couleur du fondu à l'ordonnée `y` (0 au-delà du fondu). */
export function opaciteFondu(y: number, hauteur: number): number {
  const p = hauteur > 0 ? y / hauteur : 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  for (let i = 1; i < ARRETS_FONDU.length; i++) {
    const [p1, a1] = ARRETS_FONDU[i];
    const [p0, a0] = ARRETS_FONDU[i - 1];
    if (p <= p1) return a0 + ((p - p0) / (p1 - p0)) * (a1 - a0);
  }
  return 0;
}

/**
 * Ton d'un texte posé sur le fondu (contrastes calculés sur les 6 couleurs d'enfant) :
 *  - 'clair' (blanc) tant que la couleur est encore dense (≥ 0,6) ;
 *  - 'fonce' (#0F172A à 55 %) dans la zone intermédiaire ;
 *  - null au-delà : style normal.
 */
export function tonSurFondu(y: number, hauteur: number): 'clair' | 'fonce' | null {
  const a = opaciteFondu(y, hauteur);
  if (a >= 0.6) return 'clair';
  if (a > 0.05) return 'fonce';
  return null;
}
