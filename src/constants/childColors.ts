/**
 * Couleurs personnelles d'un enfant (avatar + header de l'Accueil, CLAUDE.md « Couleur de l'enfant »).
 *
 * Exclues : ambre (Score de Joie), violet #7C3AED, vert / rouge (réservés aux interdits données),
 * dégradé Aria. Toutes assez foncées pour une initiale blanche lisible.
 * Format #RRGGBB (contrainte CHECK de children.color, M3).
 */
export const CHILD_COLORS: { hex: string; nom: string }[] = [
  { hex: '#4338CA', nom: 'Indigo' },
  { hex: '#0369A1', nom: 'Océan' },
  { hex: '#0F766E', nom: 'Sarcelle' },
  { hex: '#BE185D', nom: 'Framboise' },
  { hex: '#334155', nom: 'Ardoise' },
  { hex: '#57534E', nom: 'Pierre' },
];

export const DEFAULT_CHILD_COLOR_HEX = CHILD_COLORS[0].hex;
